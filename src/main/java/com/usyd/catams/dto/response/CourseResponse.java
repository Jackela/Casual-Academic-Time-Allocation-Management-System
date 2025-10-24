package com.usyd.catams.dto.response;

public class CourseResponse {
    private Long id;
    private String code;
    private String name;
    private Long lecturerId;
    private Boolean active;

    public CourseResponse() {}

    public CourseResponse(Long id, String code, String name, Long lecturerId, Boolean active) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.lecturerId = lecturerId;
        this.active = active;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getLecturerId() { return lecturerId; }
    public void setLecturerId(Long lecturerId) { this.lecturerId = lecturerId; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}

