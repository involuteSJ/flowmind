package com.flowmind.domain.training.controller;

import com.flowmind.domain.training.dto.StartTrainingRequest;
import com.flowmind.domain.training.dto.TrainingJobResponse;
import com.flowmind.domain.training.service.TrainingService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/training")
@RequiredArgsConstructor
public class TrainingController {

    private final TrainingService trainingService;

    /** FE → BE: 학습 시작 */
    @PostMapping("/start")
    public ResponseEntity<TrainingJobResponse> startTraining(@RequestBody StartTrainingRequest req) {
        return ResponseEntity.ok(trainingService.startTraining(req));
    }

    /** FE 폴링: 진행률 조회 */
    @GetMapping("/{jobId}/status")
    public ResponseEntity<TrainingJobResponse> getStatus(@PathVariable Integer jobId) {
        return ResponseEntity.ok(trainingService.getStatus(jobId));
    }

    /** FE: 내 학습 목록 */
    @GetMapping("/list")
    public ResponseEntity<List<TrainingJobResponse>> getMyJobs() {
        return ResponseEntity.ok(trainingService.getMyJobs());
    }

    /** FE: 모델 다운로드 */
    @GetMapping("/{jobId}/download")
    public ResponseEntity<Resource> downloadModel(@PathVariable Integer jobId) {
        TrainingJobResponse job = trainingService.getStatus(jobId);
        if (job.modelPath() == null || job.modelPath().isBlank()) {
            return ResponseEntity.notFound().build();
        }
        File file = new File(job.modelPath());
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        String filename = (job.modelName() != null ? job.modelName() : "flowmind_job" + jobId) + ".pt";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(file.length())
                .body(resource);
    }

    /** FE: 학습 취소 */
    @DeleteMapping("/{jobId}")
    public ResponseEntity<?> cancelJob(@PathVariable Integer jobId) {
        trainingService.cancelJob(jobId);
        return ResponseEntity.noContent().build();
    }

    // ── AI Server 전용 콜백 ──────────────────────────────

    @PostMapping("/{jobId}/progress")
    public ResponseEntity<?> updateProgress(
            @PathVariable Integer jobId,
            @RequestBody Map<String, Object> body
    ) {
        int progress = (int) body.get("progress");
        trainingService.updateProgress(jobId, progress);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{jobId}/complete")
    public ResponseEntity<?> completeJob(
            @PathVariable Integer jobId,
            @RequestBody Map<String, Object> body
    ) {
        String modelPath = (String) body.get("modelPath");
        trainingService.completeJob(jobId, modelPath);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{jobId}/fail")
    public ResponseEntity<?> failJob(
            @PathVariable Integer jobId,
            @RequestBody Map<String, Object> body
    ) {
        String errorMsg = (String) body.getOrDefault("errorMsg", "알 수 없는 오류");
        trainingService.failJob(jobId, errorMsg);
        return ResponseEntity.ok().build();
    }
}
