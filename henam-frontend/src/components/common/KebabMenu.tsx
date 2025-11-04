import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export interface KebabMenuAction {
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  divider?: boolean; // Add divider after this item
}

interface KebabMenuProps {
  actions: KebabMenuAction[];
  size?: 'small' | 'medium' | 'large';
  tooltip?: string;
}

const KebabMenu: React.FC<KebabMenuProps> = ({ 
  actions, 
  size = 'small',
  tooltip = 'More actions'
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevent row click events
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (event: React.MouseEvent, action: KebabMenuAction) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (action.disabled) {
      return;
    }
    
    // Close menu first
    setAnchorEl(null);
    
    // Execute action after ensuring menu is closed
    requestAnimationFrame(() => {
      action.onClick();
    });
  };

  return (
    <>
      <Tooltip title={tooltip}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <IconButton
            onClick={handleClick}
            size={size}
            sx={{
              borderRadius: 2,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white',
                transform: 'scale(1.05)',
              },
            }}
          >
            <MoreVert sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </IconButton>
        </motion.div>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            disableAutoFocusItem
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1,
                minWidth: 180,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
                overflow: 'visible',
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  transform: 'translateY(-50%) rotate(45deg)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottom: 'none',
                  borderRight: 'none',
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {actions.flatMap((action, index) => {
              const menuItems = [];
              
              // Add the main menu item
              menuItems.push(
                <motion.div
                  key={`item-${index}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <MenuItem
                    onClick={(event) => handleActionClick(event, action)}
                    disabled={action.disabled}
                    sx={{
                      mx: 1,
                      my: 0.5,
                      borderRadius: 2,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: action.color === 'error' ? 'error.main' : 'text.primary',
                      '&:hover': {
                        backgroundColor: action.color === 'error' 
                          ? 'error.main' 
                          : 'primary.light',
                        color: 'white',
                        transform: 'translateX(4px)',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                      },
                      '&.Mui-disabled': {
                        opacity: 0.5,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: action.color === 'error' ? 'error.main' : 'text.secondary',
                        minWidth: 36,
                      }}
                    >
                      {action.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={action.label}
                      primaryTypographyProps={{
                        fontSize: '0.95rem',
                        fontWeight: 500,
                      }}
                    />
                  </MenuItem>
                </motion.div>
              );
              
              // Add divider if needed
              if (action.divider && index < actions.length - 1) {
                menuItems.push(
                  <motion.div
                    key={`divider-${index}`}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: (index + 1) * 0.05, duration: 0.2 }}
                  >
                    <hr style={{ 
                      margin: '8px 16px', 
                      border: 'none', 
                      height: '1px', 
                      background: 'rgba(0, 0, 0, 0.1)' 
                    }} />
                  </motion.div>
                );
              }
              
              return menuItems;
            })}
          </Menu>
        )}
      </AnimatePresence>
    </>
  );
};

export default KebabMenu;
