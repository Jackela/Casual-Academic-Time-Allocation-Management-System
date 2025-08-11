package com.usyd.catams.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Response DTO for paginated timesheet queries.
 * 
 * This DTO follows the standard pagination pattern defined in the OpenAPI specification
 * and provides metadata about the page along with the content. Includes success field
 * for consistent API response format.
 */
public class PagedTimesheetResponse {

    @JsonProperty("success")
    private boolean success = true;

    @JsonProperty("timesheets")
    private List<TimesheetResponse> timesheets;

    @JsonProperty("pageInfo")
    private PageInfo pageInfo;

    // Default constructor
    public PagedTimesheetResponse() {
    }

    // Constructor
    public PagedTimesheetResponse(List<TimesheetResponse> timesheets, PageInfo pageInfo) {
        this.success = true;
        this.timesheets = timesheets;
        this.pageInfo = pageInfo;
    }

    // Constructor with Spring Data Page
    public PagedTimesheetResponse(List<TimesheetResponse> timesheets, int pageNumber, int pageSize,
                                long totalElements, int totalPages, boolean isFirst, boolean isLast) {
        this.success = true;
        this.timesheets = timesheets;
        this.pageInfo = new PageInfo(pageNumber, pageSize, totalElements, totalPages, isFirst, isLast);
    }

    // Getters and Setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public List<TimesheetResponse> getTimesheets() {
        return timesheets;
    }

    public void setTimesheets(List<TimesheetResponse> timesheets) {
        this.timesheets = timesheets;
    }

    // Legacy aliases removed to enforce single-source response shape (timesheets/pageInfo)

    public PageInfo getPageInfo() {
        return pageInfo;
    }

    public void setPageInfo(PageInfo pageInfo) {
        this.pageInfo = pageInfo;
    }

    // Legacy aliases removed to enforce single-source response shape (timesheets/pageInfo)

    /**
     * Inner class for pagination metadata.
     */
    public static class PageInfo {
        @JsonProperty("currentPage")
        private int number;

        @JsonProperty("pageSize")
        private int size;

        @JsonProperty("totalElements")
        private long totalElements;

        @JsonProperty("totalPages")
        private int totalPages;

        @JsonProperty("first")
        private boolean first;

        @JsonProperty("last")
        private boolean last;

        @JsonProperty("numberOfElements")
        private int numberOfElements;

        @JsonProperty("empty")
        private boolean empty;

        // Default constructor
        public PageInfo() {
        }

        // Constructor
        public PageInfo(int number, int size, long totalElements, int totalPages,
                       boolean first, boolean last) {
            this.number = number;
            this.size = size;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.first = first;
            this.last = last;
            this.numberOfElements = (int) Math.min(size, totalElements - (long) number * size);
            this.empty = totalElements == 0;
        }

        // Getters and Setters
        public int getNumber() {
            return number;
        }

        public void setNumber(int number) {
            this.number = number;
        }

        public int getSize() {
            return size;
        }

        public void setSize(int size) {
            this.size = size;
        }

        public long getTotalElements() {
            return totalElements;
        }

        public void setTotalElements(long totalElements) {
            this.totalElements = totalElements;
        }

        public int getTotalPages() {
            return totalPages;
        }

        public void setTotalPages(int totalPages) {
            this.totalPages = totalPages;
        }

        public boolean isFirst() {
            return first;
        }

        public void setFirst(boolean first) {
            this.first = first;
        }

        public boolean isLast() {
            return last;
        }

        public void setLast(boolean last) {
            this.last = last;
        }

        public int getNumberOfElements() {
            return numberOfElements;
        }

        public void setNumberOfElements(int numberOfElements) {
            this.numberOfElements = numberOfElements;
        }

        public boolean isEmpty() {
            return empty;
        }

        public void setEmpty(boolean empty) {
            this.empty = empty;
        }

        @Override
        public String toString() {
            return "PageInfo{" +
                    "number=" + number +
                    ", size=" + size +
                    ", totalElements=" + totalElements +
                    ", totalPages=" + totalPages +
                    ", first=" + first +
                    ", last=" + last +
                    ", numberOfElements=" + numberOfElements +
                    ", empty=" + empty +
                    '}';
        }
    }

    @Override
    public String toString() {
        return "PagedTimesheetResponse{" +
                "success=" + success +
                ", timesheets=" + timesheets +
                ", pageInfo=" + pageInfo +
                '}';
    }
}