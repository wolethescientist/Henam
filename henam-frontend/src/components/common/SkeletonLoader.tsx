import React from 'react';
import { Box, Skeleton, Card, CardContent } from '@mui/material';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'card' | 'table' | 'dashboard' | 'list' | 'profile' | 'jobs' | 'tasks' | 'invoices' | 'teams' | 'attendance' | 'financial';
  count?: number;
  height?: number | string;
  showHeader?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'card',
  count = 1,
  height = 200,
  showHeader = true,
  showFilters = true,
  showStats = true,
}) => {
  const shimmerAnimation = {
    initial: { x: '-100%' },
    animate: { x: '100%' },
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: "linear" as const,
    },
  };

  const renderSkeletonVariant = () => {
    switch (variant) {
      case 'jobs':
        return (
          <Box sx={{ p: 3 }}>
            {/* Header */}
            {showHeader && (
              <Box sx={{ mb: 4 }}>
                <Skeleton 
                  variant="text" 
                  width="30%" 
                  height={60}
                  sx={{ 
                    mb: 1,
                    borderRadius: 2,
                  }} 
                />
              </Box>
            )}

            {/* Search and Filters */}
            {showFilters && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3, 
                mb: 3 
              }}>
                <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={150} height={56} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {/* Stats Card */}
            {showStats && (
              <Box sx={{ mb: 3 }}>
                <Skeleton variant="rectangular" width={150} height={80} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {/* Table */}
            <Card>
              <CardContent>
                {/* Table header */}
                <Box sx={{ display: 'flex', mb: 2 }}>
                  {[...Array(7)].map((_, index) => (
                    <Skeleton 
                      key={index}
                      variant="text" 
                      width="14%" 
                      height={40} 
                      sx={{ mr: 1, borderRadius: 1 }}
                    />
                  ))}
                </Box>
                
                {/* Table rows */}
                {[...Array(count)].map((_, rowIndex) => (
                  <motion.div
                    key={rowIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="20%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="15%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="12%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                    </Box>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </Box>
        );

      case 'tasks':
        return (
          <Box sx={{ p: 3 }}>
            {/* Header */}
            {showHeader && (
              <Box sx={{ mb: 4 }}>
                <Skeleton 
                  variant="text" 
                  width="35%" 
                  height={60}
                  sx={{ 
                    mb: 1,
                    borderRadius: 2,
                  }} 
                />
              </Box>
            )}

            {/* Search and Filters */}
            {showFilters && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3, 
                mb: 3 
              }}>
                <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={150} height={56} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {/* Table */}
            <Card>
              <CardContent>
                {/* Table header */}
                <Box sx={{ display: 'flex', mb: 2 }}>
                  {[...Array(7)].map((_, index) => (
                    <Skeleton 
                      key={index}
                      variant="text" 
                      width="14%" 
                      height={40} 
                      sx={{ mr: 1, borderRadius: 1 }}
                    />
                  ))}
                </Box>
                
                {/* Table rows */}
                {[...Array(count)].map((_, rowIndex) => (
                  <motion.div
                    key={rowIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="25%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="20%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="text" width="15%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                    </Box>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </Box>
        );

      case 'invoices':
        return (
          <Box sx={{ p: 3 }}>
            {/* Header */}
            {showHeader && (
              <Box sx={{ mb: 4 }}>
                <Skeleton 
                  variant="text" 
                  width="40%" 
                  height={60}
                  sx={{ 
                    mb: 1,
                    borderRadius: 2,
                  }} 
                />
              </Box>
            )}

            {/* Search and Filters */}
            {showFilters && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3, 
                mb: 3 
              }}>
                <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={150} height={56} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {/* Overdue Alert */}
            <Box sx={{ mb: 3 }}>
              <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
            </Box>

            {/* Table */}
            <Card>
              <CardContent>
                {/* Table header */}
                <Box sx={{ display: 'flex', mb: 2 }}>
                  {[...Array(7)].map((_, index) => (
                    <Skeleton 
                      key={index}
                      variant="text" 
                      width="14%" 
                      height={40} 
                      sx={{ mr: 1, borderRadius: 1 }}
                    />
                  ))}
                </Box>
                
                {/* Table rows */}
                {[...Array(count)].map((_, rowIndex) => (
                  <motion.div
                    key={rowIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="20%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="15%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="12%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="text" width="15%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={100} height={30} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                    </Box>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </Box>
        );

      case 'teams':
        return (
          <Box sx={{ p: 3 }}>
            {/* Header */}
            {showHeader && (
              <Box sx={{ mb: 4 }}>
                <Skeleton 
                  variant="text" 
                  width="35%" 
                  height={60}
                  sx={{ 
                    mb: 1,
                    borderRadius: 2,
                  }} 
                />
              </Box>
            )}

            {/* Search and Stats */}
            {showFilters && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3, 
                mb: 3 
              }}>
                <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={150} height={80} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {/* Table */}
            <Card>
              <CardContent>
                {/* Table header */}
                <Box sx={{ display: 'flex', mb: 2 }}>
                  {[...Array(5)].map((_, index) => (
                    <Skeleton 
                      key={index}
                      variant="text" 
                      width="18%" 
                      height={40} 
                      sx={{ mr: 1, borderRadius: 1 }}
                    />
                  ))}
                </Box>
                
                {/* Table rows */}
                {[...Array(count)].map((_, rowIndex) => (
                  <motion.div
                    key={rowIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="25%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="20%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="text" width="15%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                    </Box>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </Box>
        );

      case 'attendance':
        return (
          <Box sx={{ p: 3 }}>
            {/* Header */}
            {showHeader && (
              <Box sx={{ mb: 4 }}>
                <Skeleton 
                  variant="text" 
                  width="40%" 
                  height={60}
                  sx={{ 
                    mb: 1,
                    borderRadius: 2,
                  }} 
                />
              </Box>
            )}

            {/* Filters and Stats */}
            {showFilters && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3, 
                mb: 3 
              }}>
                <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={200} height={56} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={150} height={80} sx={{ borderRadius: 1 }} />
              </Box>
            )}

            {/* Table */}
            <Card>
              <CardContent>
                {/* Table header */}
                <Box sx={{ display: 'flex', mb: 2 }}>
                  {[...Array(6)].map((_, index) => (
                    <Skeleton 
                      key={index}
                      variant="text" 
                      width="16%" 
                      height={40} 
                      sx={{ mr: 1, borderRadius: 1 }}
                    />
                  ))}
                </Box>
                
                {/* Table rows */}
                {[...Array(count)].map((_, rowIndex) => (
                  <motion.div
                    key={rowIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="25%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="20%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="text" width="15%" height={30} sx={{ mr: 2 }} />
                      <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1, mr: 2 }} />
                      <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                    </Box>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </Box>
        );

      case 'financial':
        return (
          <Box sx={{ p: 3 }}>
            {/* Header */}
            {showHeader && (
              <Box sx={{ mb: 4 }}>
                <Skeleton 
                  variant="text" 
                  width="45%" 
                  height={60}
                  sx={{ 
                    mb: 1,
                    borderRadius: 2,
                  }} 
                />
              </Box>
            )}

            {/* Stats Cards */}
            {showStats && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(4, 1fr)',
                  },
                  gap: 3,
                  mb: 4,
                }}
              >
                {[...Array(4)].map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card sx={{ height: 120, position: 'relative', overflow: 'hidden' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Skeleton 
                            variant="circular" 
                            width={40} 
                            height={40} 
                            sx={{ mr: 2 }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="60%" height={32} />
                            <Skeleton variant="text" width="80%" height={20} />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </Box>
            )}

            {/* Charts and Tables */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Box>
          </Box>
        );

      case 'dashboard':
        return (
          <Box sx={{ p: 3 }}>
            {/* Header skeleton */}
            <Box sx={{ mb: 4 }}>
              <Skeleton 
                variant="text" 
                width="40%" 
                height={60}
                sx={{ 
                  mb: 1,
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} 
              />
              <Skeleton 
                variant="text" 
                width="25%" 
                height={30}
                sx={{ 
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} 
              />
            </Box>

            {/* Stats cards skeleton */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: 3,
                mb: 4,
              }}
            >
              {[...Array(4)].map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card sx={{ height: 120, position: 'relative', overflow: 'hidden' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Skeleton 
                          variant="circular" 
                          width={40} 
                          height={40} 
                          sx={{ mr: 2 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="60%" height={32} />
                          <Skeleton variant="text" width="80%" height={20} />
                        </Box>
                      </Box>
                    </CardContent>
                    {/* Shimmer overlay */}
                    <motion.div
                      {...shimmerAnimation}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                        pointerEvents: 'none',
                      }}
                    />
                  </Card>
                </motion.div>
              ))}
            </Box>

            {/* Table skeleton */}
            <Card>
              <CardContent>
                <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
                {[...Array(5)].map((_, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="text" width="20%" height={30} sx={{ mr: 2 }} />
                    <Skeleton variant="text" width="25%" height={30} sx={{ mr: 2 }} />
                    <Skeleton variant="text" width="15%" height={30} sx={{ mr: 2 }} />
                    <Skeleton variant="text" width="20%" height={30} sx={{ mr: 2 }} />
                    <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        );

      case 'table':
        return (
          <Card>
            <CardContent>
              {/* Table header */}
              <Box sx={{ display: 'flex', mb: 2 }}>
                {[...Array(5)].map((_, index) => (
                  <Skeleton 
                    key={index}
                    variant="text" 
                    width="18%" 
                    height={40} 
                    sx={{ mr: 1, borderRadius: 1 }}
                  />
                ))}
              </Box>
              
              {/* Table rows */}
              {[...Array(count)].map((_, rowIndex) => (
                <motion.div
                  key={rowIndex}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIndex * 0.1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {[...Array(5)].map((_, colIndex) => (
                      <Skeleton 
                        key={colIndex}
                        variant="text" 
                        width="18%" 
                        height={30} 
                        sx={{ mr: 1, borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        );

      case 'list':
        return (
          <Box>
            {[...Array(count)].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card sx={{ mb: 2, position: 'relative', overflow: 'hidden' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Skeleton variant="circular" width={50} height={50} sx={{ mr: 2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="40%" height={20} />
                      </Box>
                      <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
                    </Box>
                  </CardContent>
                  {/* Shimmer overlay */}
                  <motion.div
                    {...shimmerAnimation}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                </Card>
              </motion.div>
            ))}
          </Box>
        );

      case 'profile':
        return (
          <Card sx={{ position: 'relative', overflow: 'hidden' }}>
            <CardContent>
              {/* Profile header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Skeleton variant="circular" width={80} height={80} sx={{ mr: 3 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="50%" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="30%" height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
              </Box>

              {/* Profile details */}
              {[...Array(4)].map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="25%" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" height={24} />
                </Box>
              ))}
            </CardContent>
            {/* Shimmer overlay */}
            <motion.div
              {...shimmerAnimation}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                pointerEvents: 'none',
              }}
            />
          </Card>
        );

      default: // card
        return (
          <Box>
            {[...Array(count)].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card sx={{ mb: 2, height, position: 'relative', overflow: 'hidden' }}>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
                    <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1 }} />
                      <Skeleton variant="circular" width={32} height={32} />
                    </Box>
                  </CardContent>
                  {/* Shimmer overlay */}
                  <motion.div
                    {...shimmerAnimation}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                </Card>
              </motion.div>
            ))}
          </Box>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {renderSkeletonVariant()}
    </motion.div>
  );
};

export default SkeletonLoader;
