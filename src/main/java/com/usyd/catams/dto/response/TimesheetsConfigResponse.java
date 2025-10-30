package com.usyd.catams.dto.response;

public class TimesheetsConfigResponse {

    public static class Hours {
        private double min;
        private double max;
        private double step;

        public Hours() {}

        public Hours(double min, double max, double step) {
            this.min = min;
            this.max = max;
            this.step = step;
        }

        public double getMin() { return min; }
        public void setMin(double min) { this.min = min; }
        public double getMax() { return max; }
        public void setMax(double max) { this.max = max; }
        public double getStep() { return step; }
        public void setStep(double step) { this.step = step; }
    }

    public static class WeekStart {
        private boolean mondayOnly;

        public WeekStart() {}

        public WeekStart(boolean mondayOnly) { this.mondayOnly = mondayOnly; }

        public boolean isMondayOnly() { return mondayOnly; }
        public void setMondayOnly(boolean mondayOnly) { this.mondayOnly = mondayOnly; }
    }

    private Hours hours;
    private WeekStart weekStart;
    private String currency;

    public TimesheetsConfigResponse() {}

    public TimesheetsConfigResponse(Hours hours, WeekStart weekStart, String currency) {
        this.hours = hours;
        this.weekStart = weekStart;
        this.currency = currency;
    }

    public Hours getHours() { return hours; }
    public void setHours(Hours hours) { this.hours = hours; }
    public WeekStart getWeekStart() { return weekStart; }
    public void setWeekStart(WeekStart weekStart) { this.weekStart = weekStart; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
}

