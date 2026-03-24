package com.flowmind.domain.training.service;

import com.flowmind.domain.dataset.dto.AnnotationDto;
import com.flowmind.domain.dataset.entity.Asset;
import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.repository.AssetRepository;
import com.flowmind.domain.dataset.repository.DatasetVersionRepository;
import com.flowmind.domain.training.dto.StartTrainingRequest;
import com.flowmind.domain.training.dto.TrainingJobResponse;
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
public class TrainingService {

    private final TrainingJobRepository trainingJobRepository;
    private final DatasetVersionRepository datasetVersionRepository;
    private final AssetRepository assetRepository;
    private final CurrentUserProvider currentUserProvider;
    private final RestTemplate restTemplate;

    @Value("${app.ai-server.url:http://localhost:8000}")
    private String aiServerUrl;

    @Value("${app.dataset.root-path}")
    private String datasetRootPath;

    @Value("${app.model.output-path:../models}")
    private String modelOutputPath;

    @Value("${app.be.base-url:http://localhost:8080}")
    private String beBaseUrl;

    public TrainingJobResponse startTraining(StartTrainingRequest req) {
        var user = currentUserProvider.getCurrentUser();

        // 데이터셋 이름 / 버전태그 미리 조회해서 job에 저장
        DatasetVersion versionInfo = datasetVersionRepository.findByIdWithDataset(req.datasetVersionId())
                .orElseThrow(() -> new IllegalArgumentException("버전을 찾을 수 없습니다."));

        if (versionInfo.getStatus() != DatasetVersion.Status.FINALIZED) {
            throw new IllegalStateException("확정된 버전만 학습에 사용할 수 있습니다.");
        }

        String datasetName = versionInfo.getDataset().getName();
        String versionTag  = versionInfo.getVersionTag();

        // DB에 job 생성
        TrainingJob job = TrainingJob.builder()
                .userId(user.getUserId())
                .versionId(req.datasetVersionId())
                .datasetName(datasetName)
                .versionTag(versionTag)
                .modelType(req.modelType())
                .modelSize(req.modelSize() != null ? req.modelSize() : "n")
                .epochs(req.epochs())
                .batchSize(req.batchSize())
                .learningRate(req.learningRate())
                .optimizer(req.optimizer())
                .status(TrainingJob.Status.PENDING)
                .build();
        job = trainingJobRepository.save(job);

        // AI Server에 학습 요청
        try {
            Map<String, Object> aiRequest = new HashMap<>();
            aiRequest.put("jobId", job.getJobId());
            aiRequest.put("datasetVersionId", req.datasetVersionId());
            aiRequest.put("datasetRootPath", datasetRootPath);
            aiRequest.put("modelOutputPath", modelOutputPath);
            aiRequest.put("beCallbackUrl", beBaseUrl + "/api/training");
            aiRequest.put("modelType", req.modelType());
            aiRequest.put("modelSize", req.modelSize() != null ? req.modelSize() : "n");
            aiRequest.put("epochs", req.epochs());
            aiRequest.put("batchSize", req.batchSize());
            aiRequest.put("learningRate", req.learningRate());
            aiRequest.put("optimizer", req.optimizer());

            // 어노테이션 데이터 포함
            List<Asset> assets = assetRepository.findWithAnnotationsByDatasetVersion(versionInfo);
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
            aiRequest.put("assets", assetData);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(aiRequest, headers);

            restTemplate.postForEntity(aiServerUrl + "/train", entity, Map.class);
        } catch (Exception e) {
            job.fail("AI 서버 연결 실패: " + e.getMessage());
            trainingJobRepository.save(job);
        }

        return TrainingJobResponse.from(job);
    }

    public TrainingJobResponse getStatus(Integer jobId) {
        TrainingJob job = trainingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job 없음: " + jobId));
        return toResponse(job);
    }

    public List<TrainingJobResponse> getMyJobs() {
        var user = currentUserProvider.getCurrentUser();
        return trainingJobRepository.findByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream().map(this::toResponse).toList();
    }

    private TrainingJobResponse toResponse(TrainingJob job) {
        return TrainingJobResponse.from(job, job.getDatasetName(), job.getVersionTag());
    }

    public void updateProgress(Integer jobId, int progress) {
        TrainingJob job = trainingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job 없음: " + jobId));
        job.updateProgress(progress);
        trainingJobRepository.save(job);
    }

    public void completeJob(Integer jobId, String modelPath) {
        TrainingJob job = trainingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job 없음: " + jobId));

        // 모델 이름 생성: {데이터셋명}_{버전태그}_v{모델버전}
        DatasetVersion version = datasetVersionRepository.findByIdWithDataset(job.getVersionId())
                .orElseThrow(() -> new IllegalArgumentException("버전 없음"));
        String datasetName = version.getDataset().getName()
                .replaceAll("[^a-zA-Z0-9가-힣_]", "_");  // 특수문자 → _
        String versionTag = version.getVersionTag()
                .replaceAll("[^a-zA-Z0-9가-힣_]", "_");

        // 같은 데이터셋+버전으로 완료된 job 수 → 모델 버전 결정
        int prevCount = (int) trainingJobRepository
                .findByUserIdOrderByCreatedAtDesc(job.getUserId())
                .stream()
                .filter(j -> j.getVersionId().equals(job.getVersionId())
                        && j.getStatus() == TrainingJob.Status.COMPLETED
                        && !j.getJobId().equals(jobId))
                .count();
        int modelVersion = prevCount + 1;

        String modelName = datasetName + "_" + versionTag + "_v" + modelVersion;

        job.complete(modelPath, modelName, modelVersion);
        trainingJobRepository.save(job);
    }

    public void failJob(Integer jobId, String errorMsg) {
        TrainingJob job = trainingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job 없음: " + jobId));
        job.fail(errorMsg);
        trainingJobRepository.save(job);
    }

    public void cancelJob(Integer jobId) {
        TrainingJob job = trainingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job 없음: " + jobId));
        job.cancel();
        trainingJobRepository.save(job);
    }
}
