export const ruleConfig = {
    BUSINESS_HOUR_START: parseInt(process.env.BUSINESS_HOUR_START || '8', 10),
    BUSINESS_HOUR_END: parseInt(process.env.BUSINESS_HOUR_END || '20', 10),
    MIN_DURATION_MINUTES: parseInt(process.env.MIN_DURATION_MINUTES || '15', 10),
    MAX_DURATION_MINUTES: parseInt(process.env.MAX_DURATION_MINUTES || '240', 10),
    MAX_ADVANCE_DAYS: parseInt(process.env.MAX_ADVANCE_DAYS || '30', 10),
    MAX_ACTIVE_BOOKINGS_PER_USER: parseInt(process.env.MAX_ACTIVE_BOOKINGS_PER_USER || '3', 10),
}


