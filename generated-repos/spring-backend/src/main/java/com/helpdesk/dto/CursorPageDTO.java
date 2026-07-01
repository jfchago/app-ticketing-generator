package com.helpdesk.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class CursorPageDTO<T> {
    private List<T> items;
    private String nextCursor;
    private boolean hasMore;
}
