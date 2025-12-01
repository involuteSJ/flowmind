package com.flowmind.domain.train.controller;

import com.flowmind.domain.train.dto.TrainCallbackRequest;
import com.flowmind.domain.train.dto.TrainJobResponse;
import com.flowmind.domain.train.dto.TrainRequest;
import com.flowmind.domain.train.entity.TrainJob;
import com.flowmind.domain.train.service.TrainService;
import com.flowmind.domain.user.service.UserService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/train")
@RequiredArgsConstructor
public class TrainController {

    private final TrainService trainService;
    private final UserService userService;

    /**
     * 학습 시작 API
     * - 프론트에서 hyperparam + model + dataset 정보를 보내면,
     *   GPU 서버에 학습을 요청하고 jobId 를 반환
     */
    @PostMapping
    public ResponseEntity<TrainJobResponse> startTraining(
            @RequestBody TrainRequest request,
            @AuthenticationPrincipal String email
    ) {
        Long userId = userService.findUserIdByEmail(email);
        TrainJob job = trainService.startTraining(request, userId);

        return ResponseEntity.ok(
        		new TrainJobResponse(job.getId(), job.getStatus().name())
        );
    }

    /**
     * 학습 상태 조회 API
     * - 프론트에서 jobId 로 폴링해서 학습 상태를 확인
     */
    @GetMapping("/{jobId}")
    public ResponseEntity<TrainJobResponse> getTrainStatus(
            @PathVariable Long jobId,
            @AuthenticationPrincipal String email
    ) {
        Long userId = userService.findUserIdByEmail(email);
        TrainJob job = trainService.getJobForUser(jobId, userId);

        return ResponseEntity.ok(
                new TrainJobResponse(job.getId(), job.getStatus().name(), job.getResultModelPath())
        );
    }

    /**
     * GPU 서버 콜백 API
     * - GPU 서버가 학습 완료(or 실패) 시 이 엔드포인트로 호출
     */
    @PostMapping("/callback")
    public ResponseEntity<Void> gpuCallback(@RequestBody TrainCallbackRequest request) {
        // TODO: GPU 서버에서 오는 요청인지 검증 (API-Key, shared secret 등)
        trainService.handleGpuCallback(request);
        return ResponseEntity.ok().build();
    }
}
