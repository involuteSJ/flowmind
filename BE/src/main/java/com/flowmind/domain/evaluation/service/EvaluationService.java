package com.flowmind.domain.evaluation.service;

import com.flowmind.domain.dataset.entity.Asset;
import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.repository.AssetRepository;
import com.flowmind.domain.dataset.repository.DatasetVersionRepository;
import com.flowmind.domain.evaluation.dto.EvaluationJobResponse;
import com.flowmind.domain.evaluation.dto.StartEvaluationRequest;
import com.flowmind.domain.evaluation.entity.EvaluationJob;
import com.flowmind.domain.evaluation.repository.EvaluationJobRepository;
import com.flowmind.domain.training.entity.TrainingJob;
import com.flowmind.domain.training.repository.TrainingJobRepository;
import com.flowmind.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class EvaluationService {

    private final EvaluationJobRepository evalJobRepository;
    private final TrainingJobRepository trainingJobRepository;
    private final DatasetVersionRepository datasetVersionRepository;
    private final AssetRepository assetRepository;
    private final CurrentUserProvider currentUserProvider;
    private final RestTemplate restTemplate;

    @Value("${app.ai-server.url:http://localhost:8000}")
    private String aiServerUrl;

    @Value("${app.be.base-url:http://localhost:8080}")
    private String beBaseUrl;

    public EvaluationJobResponse startEvaluation(StartEvaluationRequest req) {
        var user = currentUserProvider.getCurrentUser();

        TrainingJob trainingJob = trainingJobRepository.findById(req.trainingJobId())
                .orElseThrow(() -> new IllegalArgumentException("학습 Job을 찾을 수 없습니다."));

        if (trainingJob.getStatus() != TrainingJob.Status.COMPLETED) {
            throw new IllegalStateException("완료된 학습 모델만 평가할 수 있습니다.");
        }

        DatasetVersion version = datasetVersionRepository.findByIdWithDataset(req.datasetVersionId())
                .orElseThrow(() -> new IllegalArgumentException("데이터셋 버전을 찾을 수 없습니다."));

        EvaluationJob job = EvaluationJob.builder()
                .userId(user.getUserId())
                .trainingJobId(req.trainingJobId())
                .modelName(trainingJob.getModelName())
                .datasetVersionId(req.datasetVersionId())
                .datasetName(version.getDataset().getName())
                .versionTag(version.getVersionTag())
                .testSplit(req.testSplit() != null ? req.testSplit() : 20)
                .status(EvaluationJob.Status.PENDING)
                .build();
        job = evalJobRepository.save(job);

        try {
            List<Asset> assets = assetRepository.findWithAnnotationsByDatasetVersion(version);
            List<Map<String, Object>> assetData = assets.stream().map(asset -> {
                Map<String, Object> a = new HashMap<>();
                a.put("assetId", asset.getAssetId());
                a.put("filename", asset.getName());
                a.put("storagePath", asset.getStorageUri());
                List<Map<String, Object>> anns = asset.getAnnotations().stream().map(ann -> {
                    Map<String, Object> an = new HashMap<>();
                    an.put("classId", ann.getLabelClass().getClassId());
                    an.put("className", ann.getLabelClass().getName());
                    an.put("xCenter", ann.getXCenter());
                    an.put("yCenter", ann.getYCenter());
                    an.put("width", ann.getWidth());
                    an.put("height", ann.getHeight());
                    return an;
                }).toList();
                a.put("annotations", anns);
                return a;
            }).toList();

            Map<String, Object> aiRequest = new HashMap<>();
            aiRequest.put("evalId", job.getEvalId());
            aiRequest.put("modelPath", trainingJob.getModelPath());
            aiRequest.put("testSplit", job.getTestSplit());
            aiRequest.put("beCallbackUrl", beBaseUrl + "/api/evaluation");
            aiRequest.put("assets", assetData);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(aiServerUrl + "/evaluate", new HttpEntity<>(aiRequest, headers), Map.class);
        } catch (Exception e) {
            job.fail("AI 서버 연결 실패: " + e.getMessage());
            evalJobRepository.save(job);
        }

        return EvaluationJobResponse.from(job);
    }

    public EvaluationJobResponse getStatus(Integer evalId) {
        return EvaluationJobResponse.from(
                evalJobRepository.findById(evalId)
                        .orElseThrow(() -> new IllegalArgumentException("평가 Job 없음: " + evalId))
        );
    }

    public List<EvaluationJobResponse> getMyJobs() {
        var user = currentUserProvider.getCurrentUser();
        return evalJobRepository.findByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream().map(EvaluationJobResponse::from).toList();
    }

    public void updateProgress(Integer evalId, int progress) {
        EvaluationJob job = evalJobRepository.findById(evalId)
                .orElseThrow(() -> new IllegalArgumentException("평가 Job 없음: " + evalId));
        job.updateProgress(progress);
        evalJobRepository.save(job);
    }

    public void completeJob(Integer evalId, Double precision, Double recall, Double map50, Double map5095) {
        EvaluationJob job = evalJobRepository.findById(evalId)
                .orElseThrow(() -> new IllegalArgumentException("평가 Job 없음: " + evalId));
        job.complete(precision, recall, map50, map5095);
        evalJobRepository.save(job);
    }

    public void failJob(Integer evalId, String errorMsg) {
        EvaluationJob job = evalJobRepository.findById(evalId)
                .orElseThrow(() -> new IllegalArgumentException("평가 Job 없음: " + evalId));
        job.fail(errorMsg);
        evalJobRepository.save(job);
    }

    /** 평가 가능한 완료된 학습 목록 반환 */
    public List<Map<String, Object>> getCompletedTrainingJobs() {
        var user = currentUserProvider.getCurrentUser();
        return trainingJobRepository.findByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .filter(j -> j.getStatus() == TrainingJob.Status.COMPLETED && j.getModelPath() != null)
                .map(j -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("jobId", j.getJobId());
                    m.put("modelName", j.getModelName());
                    m.put("datasetName", j.getDatasetName());
                    m.put("versionTag", j.getVersionTag());
                    m.put("modelType", j.getModelType());
                    m.put("modelSize", j.getModelSize());
                    m.put("createdAt", j.getCreatedAt() != null ? j.getCreatedAt().toString() : null);
                    return m;
                }).toList();
    }
}
