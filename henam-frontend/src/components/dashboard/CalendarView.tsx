import React, { useMemo, memo, useState } from 'react';
import moment from 'moment';
import { Box, Paper, Typography, Chip, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import './CalendarView.css';

interface Job {
  id: number;
  title: string;
  client: string;
  team_name?: string | null;
  supervisor_name?: string | null;
  status: string;
  progress: number;
  start_date?: string | null;
  end_date?: string | null;
  deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  description?: string;
  budget?: number;
}

interface CalendarViewProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  searchTerm: string;
}

const CalendarView: React.FC<CalendarViewProps> = memo(({ jobs, onJobClick, searchTerm }) => {
  const [currentDate, setCurrentDate] = useState(moment());
  
  // Filter jobs based on search term
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.supervisor_name && job.supervisor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.team_name && job.team_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [jobs, searchTerm]);

  // Create a map of jobs by date for calendar indicators
  const jobsByDate = useMemo(() => {
    const now = moment();
    const jobsMap: { [key: string]: { jobs: Job[], hasUrgent: boolean } } = {};
    
    filteredJobs.forEach(job => {
      // Determine the date to use for the job
      let eventDate: moment.Moment;
      
      if (job.end_date) {
        eventDate = moment(job.end_date);
      } else if (job.deadline) {
        eventDate = moment(job.deadline);
      } else if (job.start_date) {
        eventDate = moment(job.start_date);
      } else {
        eventDate = moment(job.created_at || job.updated_at || new Date());
      }

      const dateKey = eventDate.format('YYYY-MM-DD');
      
      if (!jobsMap[dateKey]) {
        jobsMap[dateKey] = { jobs: [], hasUrgent: false };
      }
      
      jobsMap[dateKey].jobs.push(job);
      
      // Check if this job is urgent (within 2 days of deadline)
      const deadline = job.deadline ? moment(job.deadline) : (job.end_date ? moment(job.end_date) : null);
      const isUrgent = deadline ? deadline.diff(now, 'days') <= 2 && deadline.diff(now, 'days') >= 0 : false;
      
      if (isUrgent) {
        jobsMap[dateKey].hasUrgent = true;
      }
    });
    
    return jobsMap;
  }, [filteredJobs]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => prev.clone().subtract(1, 'month'));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => prev.clone().add(1, 'month'));
  };

  const goToToday = () => {
    setCurrentDate(moment());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const startOfMonth = currentDate.clone().startOf('month');
    const endOfMonth = currentDate.clone().endOf('month');
    const startOfCalendar = startOfMonth.clone().startOf('week');
    const endOfCalendar = endOfMonth.clone().endOf('week');
    
    const days = [];
    const day = startOfCalendar.clone();
    
    while (day.isSameOrBefore(endOfCalendar, 'day')) {
      days.push(day.clone());
      day.add(1, 'day');
    }
    
    return days;
  };

  const days = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ height: '100%' }}
    >
      <Paper 
        sx={{ 
          height: '100%',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          boxShadow: '0px 20px 60px rgba(0, 0, 0, 0.12), 0px 8px 25px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4caf50 0%, #66bb6a 25%, #81c784 50%, #66bb6a 75%, #4caf50 100%)',
            zIndex: 1,
          },
        }}
      >
        <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h4"
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 50%, #388e3c 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              📅 Calendar View
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Chip 
                label="🟢 Normal Jobs" 
                size="medium" 
                sx={{ 
                  backgroundColor: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
                  color: '#2e7d32',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                }}
              />
              <Chip 
                label="🔴 Urgent Jobs (≤2 days)" 
                size="medium" 
                sx={{ 
                  backgroundColor: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
                  color: '#d32f2f',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(244, 67, 54, 0.2)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                }}
              />
            </Box>
          </Box>

          {/* Navigation Toolbar */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 3,
            p: 3,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(15px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
          }}>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={goToPreviousMonth}
              style={{
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 50%, #388e3c 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
              }}
            >
              ← Previous
            </motion.button>

            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 50%, #388e3c 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.01em',
                textAlign: 'center',
                minWidth: '200px',
              }}
            >
              {currentDate.format('MMMM YYYY')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToToday}
                style={{
                  background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
                  border: '2px solid #4caf50',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: '#4caf50',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                }}
              >
                Today
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNextMonth}
                style={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 50%, #388e3c 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                }}
              >
                Next →
              </motion.button>
            </Box>
          </Box>

          {/* Calendar Grid */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Day headers */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 2, gap: 1 }}>
              {weekDays.map((dayName) => (
                <Box
                  key={dayName}
                  sx={{
                    padding: '16px 8px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 50%, #388e3c 100%)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '15px',
                    borderRadius: 3,
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                    letterSpacing: '0.5px',
                  }}
                >
                  {dayName}
                </Box>
              ))}
            </Box>
            
            {/* Calendar days */}
            <Box sx={{ 
              flex: 1, 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gridTemplateRows: 'repeat(6, 1fr)',
              minHeight: '480px',
              gap: 1,
            }}>
              {days.map((day, index) => {
                const dateKey = day.format('YYYY-MM-DD');
                const dayJobs = jobsByDate[dateKey];
                const isCurrentMonth = day.isSame(currentDate, 'month');
                const isToday = day.isSame(moment(), 'day');
                
                return (
                  <Box
                    key={index}
                    sx={{
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      backgroundColor: dayJobs?.hasUrgent 
                        ? 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)' 
                        : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      padding: '8px',
                      cursor: dayJobs ? 'pointer' : 'default',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: isCurrentMonth ? 1 : 0.4,
                      minHeight: '80px',
                      borderRadius: 3,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      position: 'relative',
                      '&:hover': dayJobs ? {
                        backgroundColor: dayJobs.hasUrgent 
                          ? 'linear-gradient(135deg, #ffcdd2 0%, #f8bbd9 100%)' 
                          : 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      } : {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      },
                    }}
                    onClick={() => {
                      if (dayJobs && dayJobs.jobs.length > 0) {
                        onJobClick(dayJobs.jobs[0]);
                      }
                    }}
                  >
                    {/* Day number */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday ? 800 : 700,
                        color: dayJobs?.hasUrgent ? '#d32f2f' : (isToday ? '#2e7d32' : '#333'),
                        fontSize: '16px',
                        mb: 1,
                        textShadow: dayJobs?.hasUrgent ? '0 1px 2px rgba(255,255,255,0.5)' : '0 1px 2px rgba(0,0,0,0.1)',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      {day.format('D')}
                    </Typography>
                    
                    {/* Job names */}
                    {dayJobs && dayJobs.jobs.length > 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          width: '100%',
                          maxHeight: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        {dayJobs.jobs.slice(0, 2).map((job, jobIndex) => (
                          <Tooltip
                            key={`${job.id}-${jobIndex}`}
                            title={`${job.title} - ${job.client}`}
                            arrow
                          >
                            <Box
                              sx={{
                                background: dayJobs.hasUrgent 
                                  ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.9) 0%, rgba(229, 57, 53, 0.9) 100%)' 
                                  : 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                textAlign: 'center',
                                overflow: 'hidden',
                                border: dayJobs.hasUrgent ? '1px solid #d32f2f' : '1px solid #4caf50',
                                width: '100%',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                position: 'relative',
                                zIndex: 2,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: dayJobs.hasUrgent ? 'white' : '#000',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.3,
                                  textShadow: dayJobs.hasUrgent ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                                }}
                              >
                                {job.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: dayJobs.hasUrgent ? 'white' : '#444',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  lineHeight: 1.3,
                                  textShadow: dayJobs.hasUrgent ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                                }}
                              >
                                {job.client}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ))}
                        {dayJobs.jobs.length > 2 && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '10px',
                              color: dayJobs.hasUrgent ? '#fff' : '#333',
                              fontWeight: 700,
                              textAlign: 'center',
                              backgroundColor: dayJobs.hasUrgent ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              textShadow: dayJobs.hasUrgent ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                            }}
                          >
                            +{dayJobs.jobs.length - 2} more
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
});

CalendarView.displayName = 'CalendarView';

export default CalendarView;