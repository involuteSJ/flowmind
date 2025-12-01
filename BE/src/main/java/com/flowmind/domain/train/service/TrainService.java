package com.flowmind.domain.train.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.repository.DatasetVersionRepository;
import com.flowmind.domain.train.dto.TrainCallbackRequest;
import com.flowmind.domain.train.dto.TrainRequest;
import com.flowmind.domain.train.entity.TrainJob;
import com.flowmind.domain.train.entity.TrainJobStatus;
import com.flowmind.domain.train.repository.TrainJobRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TrainService {

    private final DatasetVersionRepository datasetVersionRepository;
    private final TrainJobRepository trainJobRepository;
    private final RestTemplate restTemplate;

    // application.properties 에서 설정 (예: http://gpu-server:9000)
    @Value("${app.gpu-server.url}")
    private String gpuServerUrl;

    /**
     * 프론트에서 학습 요청이 들어왔을 때 호출되는 메서드.
     * - datasetVersion 검증
     * - TrainJob 생성 & 저장
     * - GPU 서버로 학습 시작 요청
     */
    public TrainJob startTraining(TrainRequest request, Long userId) {

        // 1) datasetVersion 유효성 검증
        DatasetVersion datasetVersion = datasetVersionRepository
                .findByDatasetIdAndVersionAndUser(
                        request.getDatasetId(),
                        request.getDatasetVersion(),
                        userId
                )
                .orElseThrow(() -> new IllegalArgumentException("데이터셋 버전을 찾을 수 없습니다."));

        // 2) TrainJob 생성 (status=QUEUED)
        LocalDateTime now = LocalDateTime.now();

        TrainJob job = TrainJob.builder()
                .userId(userId)
                .datasetVersion(datasetVersion)
                .modelType(request.getModel().getType())
                .modelBase(request.getModel().getBase())
                .modelSize(request.getModel().getSize())
                .epochs(request.getHyperparams().getEpochs())
                .batchSize(request.getHyperparams().getBatchSize())
                .learningRate(request.getHyperparams().getLearningRate())
                .optimizer(request.getHyperparams().getOptimizer())
                .status(TrainJobStatus.QUEUED)
                .createdAt(now)
                .updatedAt(now)
                .build();

        job = trainJobRepository.save(job);

        // 3) GPU 서버로 전달할 payload 구성
        Map<String, Object> payload = new HashMap<>();
        payload.put("jobId", job.getId());
        payload.put("datasetId", request.getDatasetId());
        payload.put("datasetVersion", request.getDatasetVersion());

        Map<String, Object> model = new HashMap<>();
        model.put("type", request.getModel().getType());
        model.put("base", request.getModel().getBase());
        model.put("size", request.getModel().getSize());
        payload.put("model", model);

        Map<String, Object> hyper = new HashMap<>();
        hyper.put("epochs", request.getHyperparams().getEpochs());
        hyper.put("batchSize", request.getHyperparams().getBatchSize());
        hyper.put("learningRate", request.getHyperparams().getLearningRate());
        hyper.put("optimizer", request.getHyperparams().getOptimizer());
        payload.put("hyperparams", hyper);

        // 4) GPU 서버로 REST 호출 (예: POST http://gpu-server:9000/api/gpu/train)
        try {
            String url = gpuServerUrl + "/api/gpu/train";
            restTemplate.postForEntity(url, payload, Void.class);
            // 호출 성공 → RUNNING 으로 상태 변경
            job.setStatus(TrainJobStatus.RUNNING);
            job.setUpdatedAt(LocalDateTime.now());
            job = trainJobRepository.save(job);
        } catch (Exception e) {
            // GPU 서버 호출 실패 시, job 자체를 FAILED 로 표시
            job.setStatus(TrainJobStatus.FAILED);
            job.setErrorMessage("GPU 서버 호출 실패: " + e.getMessage());
            job.setUpdatedAt(LocalDateTime.now());
            job = trainJobRepository.save(job);
        }

        return job;
    }

    /**
     * 특정 유저가 가진 jobId에 대해서만 조회 (권한 체크 용)
     */
    public TrainJob getJobForUser(Long jobId, Long userId) {
        return trainJobRepository.findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new IllegalArgumentException("학습 작업을 찾을 수 없거나 권한이 없습니다."));
    }

    /**
     * GPU 서버에서 콜백을 보내줄 때 호출되는 메서드.
     * - status = SUCCESS / FAILED
     * - resultModelPath / errorMessage 업데이트
     */
    public void handleGpuCallback(TrainCallbackRequest request) {

        TrainJob job = trainJobRepository.findById(request.getJobId())
                .orElseThrow(() -> new IllegalArgumentException("TrainJob 을 찾을 수 없습니다. jobId=" + request.getJobId()));

        TrainJobStatus status = TrainJobStatus.valueOf(request.getStatus().toUpperCase());
        job.setStatus(status);
        job.setUpdatedAt(LocalDateTime.now());

        if (status == TrainJobStatus.SUCCESS) {
            job.setResultModelPath(request.getResultModelPath());

            // TODO: 여기에서 model / evaluation 테이블에 insert 하는 로직 추가 가능
            //  ex) modelService.createModelFromTrainJob(job);

        } else if (status == TrainJobStatus.FAILED) {
            job.setErrorMessage(request.getErrorMessage());
        }

        trainJobRepository.save(job);
    }
}
