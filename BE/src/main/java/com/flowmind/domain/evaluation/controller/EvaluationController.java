package com.flowmind.domain.evaluation.controller;

import com.flowmind.domain.evaluation.dto.EvaluationJobResponse;
import com.flowmind.domain.evaluation.dto.StartEvaluationRequest;
import com.flowmind.domain.evaluation.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/evaluation")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    @PostMapping("/start")
    public ResponseEntity<EvaluationJobResponse> startEvaluation(@RequestBody StartEvaluationRequest req) {
        return ResponseEntity.ok(evaluationService.startEvaluation(req));
    }

    @GetMapping("/{evalId}/status")
    public ResponseEntity<EvaluationJobResponse> getStatus(@PathVariable Integer evalId) {
        return ResponseEntity.ok(evaluationService.getStatus(evalId));
    }

    @GetMapping("/list")
    public ResponseEntity<List<EvaluationJobResponse>> getMyJobs() {
        return ResponseEntity.ok(evaluationService.getMyJobs());
    }

    /** 평가 가능한 완료된 학습 모델 목록 */
    @GetMapping("/models")
    public ResponseEntity<List<Map<String, Object>>> getCompletedModels() {
        return ResponseEntity.ok(evaluationService.getCompletedTrainingJobs());
    }

    // ── AI Server 콜백 ──────────────────────────

    @PostMapping("/{evalId}/progress")
    public ResponseEntity<?> updateProgress(@PathVariable Integer evalId, @RequestBody Map<String, Object> body) {
        int progress = (int) body.get("progress");
        evaluationService.updateProgress(evalId, progress);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{evalId}/complete")
    public ResponseEntity<?> completeJob(@PathVariable Integer evalId, @RequestBody Map<String, Object> body) {
        evaluationService.completeJob(
                evalId,
                toDouble(body.get("precision")),
                toDouble(body.get("recall")),
                toDouble(body.get("map50")),
                toDouble(body.get("map5095"))
        );
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{evalId}/fail")
    public ResponseEntity<?> failJob(@PathVariable Integer evalId, @RequestBody Map<String, Object> body) {
        evaluationService.failJob(evalId, (String) body.getOrDefault("errorMsg", "알 수 없는 오류"));
        return ResponseEntity.ok().build();
    }

    private Double toDouble(Object val) {
        if (val == null) return null;
        if (val instanceof Double d) return d;
        if (val instanceof Number n) return n.doubleValue();
        return null;
    }
}
