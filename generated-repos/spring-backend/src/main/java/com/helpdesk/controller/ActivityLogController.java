
package com.helpdesk.controller;

import com.helpdesk.dto.ActivityLogDTO;
import com.helpdesk.service.ActivityLogService;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;




@RestController
@RequestMapping("/api/activity-logs")
@RequiredArgsConstructor
public class ActivityLogController {

    private final ActivityLogService activityLogService;



    @GetMapping("/{id}")
    public ResponseEntity<ActivityLogDTO> getById(@PathVariable String id) {
        return ResponseEntity.ok(activityLogService.getById(id));
    }



}
