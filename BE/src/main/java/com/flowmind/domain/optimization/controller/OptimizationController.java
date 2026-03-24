package com.flowmind.domain.optimization.controller;

import com.flowmind.domain.optimization.dto.OptimizationJobResponse;
import com.flowmind.domain.optimization.dto.StartOptimizationRequest;
import com.flowmind.domain.optimization.service.OptimizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/optimization")
@RequiredArgsConstructor
public class OptimizationController {

    private final OptimizationService optimizationService;

    @PostMapping("/start")
    public ResponseEntity<OptimizationJobResponse> startOptimization(@RequestBody StartOptimizationRequest req) {
        return ResponseEntity.ok(optimizationService.startOptimization(req));
    }

    @GetMapping("/{optId}/status")
    public ResponseEntity<OptimizationJobResponse> getStatus(@PathVariable Integer optId) {
        return ResponseEntity.ok(optimizationService.getStatus(optId));
    }

    @GetMapping("/list")
    public ResponseEntity<List<OptimizationJobResponse>> getMyJobs() {
        return ResponseEntity.ok(optimizationService.getMyJobs());
    }

    @GetMapping("/models")
    public ResponseEntity<List<Map<String, Object>>> getCompletedModels() {
        return ResponseEntity.ok(optimizationService.getCompletedTrainingJobs());
    }

    @GetMapping("/{optId}/download")
    public ResponseEntity<Resource> download(@PathVariable Integer optId) {
        Resource resource = optimizationService.downloadOptimizedModel(optId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    // ── AI Server 콜백 ───────────────────────────

    @PostMapping("/{optId}/progress")
    public ResponseEntity<?> updateProgress(@PathVariable Integer optId, @RequestBody Map<String, Object> body) {
        optimizationService.updateProgress(optId, (int) body.get("progress"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{optId}/complete")
    public ResponseEntity<?> completeJob(@PathVariable Integer optId, @RequestBody Map<String, Object> body) {
        optimizationService.completeJob(
                optId,
                (String) body.get("outputPath"),
                body.get("outputSizeMb") instanceof Number n ? n.doubleValue() : null
        );
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{optId}/fail")
    public ResponseEntity<?> failJob(@PathVariable Integer optId, @RequestBody Map<String, Object> body) {
        optimizationService.failJob(optId, (String) body.getOrDefault("errorMsg", "알 수 없는 오류"));
        return ResponseEntity.ok().build();
    }
}
