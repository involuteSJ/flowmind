package com.flowmind.domain.optimization.service;

import com.flowmind.domain.optimization.dto.OptimizationJobResponse;
import com.flowmind.domain.optimization.dto.StartOptimizationRequest;
import com.flowmind.domain.optimization.entity.OptimizationJob;
import com.flowmind.domain.optimization.repository.OptimizationJobRepository;
import com.flowmind.domain.training.entity.TrainingJob;
import com.flowmind.domain.training.repository.TrainingJobRepository;
import com.flowmind.util.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class OptimizationService {

    private final OptimizationJobRepository optJobRepository;
    private final TrainingJobRepository trainingJobRepository;
    private final CurrentUserProvider currentUserProvider;
    private final RestTemplate restTemplate;

    @Value("${app.ai-server.url:http://localhost:8000}")
    private String aiServerUrl;

    @Value("${app.be.base-url:http://localhost:8080}")
    private String beBaseUrl;

    @Value("${app.model.output-path:C:/AI/coding/flowmind/models}")
    private String modelOutputPath;

    public OptimizationJobResponse startOptimization(StartOptimizationRequest req) {
        var user = currentUserProvider.getCurrentUser();

        TrainingJob trainingJob = trainingJobRepository.findById(req.trainingJobId())
                .orElseThrow(() -> new IllegalArgumentException("학습 Job을 찾을 수 없습니다."));

        if (trainingJob.getStatus() != TrainingJob.Status.COMPLETED || trainingJob.getModelPath() == null) {
            throw new IllegalStateException("완료된 학습 모델만 경량화할 수 있습니다.");
        }

        OptimizationJob.Format format = OptimizationJob.Format.valueOf(req.format().toUpperCase());

        OptimizationJob job = OptimizationJob.builder()
                .userId(user.getUserId())
                .trainingJobId(req.trainingJobId())
                .sourceModelName(trainingJob.getModelName())
                .datasetName(trainingJob.getDatasetName())
                .versionTag(trainingJob.getVersionTag())
                .format(format)
                .imgSize(req.imgSize() != null ? req.imgSize() : 640)
                .halfPrecision(req.halfPrecision() != null ? req.halfPrecision() : false)
                .dynamic(req.dynamic() != null ? req.dynamic() : false)
                .simplify(req.simplify() != null ? req.simplify() : true)
                .opset(req.opset() != null ? req.opset() : 12)
                .workspace(req.workspace() != null ? req.workspace() : 4)
                .build();
        job = optJobRepository.save(job);

        try {
            Map<String, Object> aiRequest = new HashMap<>();
            aiRequest.put("optId", job.getOptId());
            aiRequest.put("modelPath", trainingJob.getModelPath());
            // 고유 파일명용 레이블 — 학습 모델명 그대로 활용 (datasetName_versionTag_vN)
            aiRequest.put("modelLabel", trainingJob.getModelName() != null
                    ? trainingJob.getModelName() : "model_" + job.getOptId());
            aiRequest.put("format", format.name().toLowerCase());
            aiRequest.put("imgSize", job.getImgSize());
            aiRequest.put("halfPrecision", job.getHalfPrecision());
            aiRequest.put("dynamic", job.getDynamic());
            aiRequest.put("simplify", job.getSimplify());
            aiRequest.put("opset", job.getOpset());
            aiRequest.put("workspace", job.getWorkspace());
            aiRequest.put("outputDir", modelOutputPath + "/" + job.getOptId() + "/optimized");
            aiRequest.put("beCallbackUrl", beBaseUrl + "/api/optimization");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(aiServerUrl + "/optimize", new HttpEntity<>(aiRequest, headers), Map.class);
        } catch (Exception e) {
            job.fail("AI 서버 연결 실패: " + e.getMessage());
            optJobRepository.save(job);
        }

        return OptimizationJobResponse.from(job);
    }

    public OptimizationJobResponse getStatus(Integer optId) {
        return OptimizationJobResponse.from(
                optJobRepository.findById(optId)
                        .orElseThrow(() -> new IllegalArgumentException("경량화 Job 없음: " + optId))
        );
    }

    public List<OptimizationJobResponse> getMyJobs() {
        var user = currentUserProvider.getCurrentUser();
        return optJobRepository.findByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream().map(OptimizationJobResponse::from).toList();
    }

    public void updateProgress(Integer optId, int progress) {
        OptimizationJob job = optJobRepository.findById(optId)
                .orElseThrow(() -> new IllegalArgumentException("경량화 Job 없음: " + optId));
        job.updateProgress(progress);
        optJobRepository.save(job);
    }

    public void completeJob(Integer optId, String outputPath, Double outputSizeMb) {
        OptimizationJob job = optJobRepository.findById(optId)
                .orElseThrow(() -> new IllegalArgumentException("경량화 Job 없음: " + optId));
        job.complete(outputPath, outputSizeMb);
        optJobRepository.save(job);
    }

    public void failJob(Integer optId, String errorMsg) {
        OptimizationJob job = optJobRepository.findById(optId)
                .orElseThrow(() -> new IllegalArgumentException("경량화 Job 없음: " + optId));
        job.fail(errorMsg);
        optJobRepository.save(job);
    }

    public Resource downloadOptimizedModel(Integer optId) {
        OptimizationJob job = optJobRepository.findById(optId)
                .orElseThrow(() -> new IllegalArgumentException("경량화 Job 없음: " + optId));
        if (job.getStatus() != OptimizationJob.Status.COMPLETED || job.getOutputPath() == null) {
            throw new IllegalStateException("완료된 경량화 Job만 다운로드할 수 있습니다.");
        }
        Path path = Paths.get(job.getOutputPath());
        if (!Files.exists(path)) throw new IllegalStateException("파일을 찾을 수 없습니다: " + job.getOutputPath());
        return new FileSystemResource(path);
    }

    /** 경량화 가능한 완료 학습 목록 */
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
