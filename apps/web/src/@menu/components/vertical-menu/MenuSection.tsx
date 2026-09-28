'use client';

// React Imports
import { forwardRef } from 'react';
import type {
  ForwardRefRenderFunction,
  CSSProperties,
  KeyboardEvent,
  ReactElement,
  ReactNode,
} from 'react';

// Third-party Imports
import classnames from 'classnames';
import type { CSSObject } from '@emotion/styled';

// Type Imports
import type { MenuSectionStyles } from './Menu';
import type { ChildrenType, RootStylesType } from '../../types';

// Hook Imports
import useVerticalNav from '../../hooks/useVerticalNav';
import useVerticalMenu from '../../hooks/useVerticalMenu';

// Util Imports
import { menuClasses } from '../../utils/menuClasses';

// Styled Component Imports
import StyledMenuIcon from '../../styles/StyledMenuIcon';
import StyledMenuPrefix from '../../styles/StyledMenuPrefix';
import StyledMenuSuffix from '../../styles/StyledMenuSuffix';
import StyledMenuSectionLabel from '../../styles/StyledMenuSectionLabel';
import StyledVerticalMenuSection from '../../styles/vertical/StyledVerticalMenuSection';

export type MenuSectionProps = Partial<ChildrenType> &
  RootStylesType & {
    label: ReactNode;
    icon?: ReactElement;
    prefix?: ReactNode;
    suffix?: ReactNode;

    /** Collapsible section: pass both to make the heading toggle its children. */
    open?: boolean;
    onToggle?: () => void;

    /**
     * @ignore
     */
    className?: string;
  };

type MenuSectionElement = keyof MenuSectionStyles;

const menuSectionWrapperStyles: CSSProperties = {
  display: 'inline-block',
  inlineSize: '100%',
  position: 'relative',
  listStyle: 'none',
  padding: 0,
  overflow: 'hidden',
};

const menuSectionContentStyles: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  inlineSize: '100%',
  position: 'relative',
  paddingBlock: '0.75rem',
  paddingInline: '1.25rem',
  overflow: 'hidden',
};

const MenuSection: ForwardRefRenderFunction<HTMLLIElement, MenuSectionProps> = (props, ref) => {
  // Props
  const {
    children,
    icon,
    className,
    prefix,
    suffix,
    label,
    rootStyles,
    open = true,
    onToggle,
    ...rest
  } = props;

  // Hooks
  const { isCollapsed, isHovered } = useVerticalNav();
  const { menuSectionStyles, collapsedMenuSectionLabel, textTruncate } = useVerticalMenu();

  // The mini (collapsed, not hovered) sidebar hides section headings, so always show items there.
  const collapsedNotHovered = isCollapsed && !isHovered;
  const showChildren = open || collapsedNotHovered || !onToggle;

  const toggleProps =
    onToggle && !collapsedNotHovered
      ? {
          role: 'button',
          tabIndex: 0,
          'aria-expanded': open,
          onClick: onToggle,
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          },
        }
      : {};

  const getMenuSectionStyles = (element: MenuSectionElement): CSSObject | undefined => {
    // If the menuSectionStyles prop is provided, get the styles for the element from the prop
    if (menuSectionStyles) {
      return menuSectionStyles[element];
    }
  };

  return (
    // Menu Section
    <StyledVerticalMenuSection
      ref={ref}
      rootStyles={rootStyles}
      menuSectionStyles={getMenuSectionStyles('root')}
      className={classnames(menuClasses.menuSectionRoot, className)}
    >
      {/* Menu Section Content Wrapper */}
      <ul className={menuClasses.menuSectionWrapper} {...rest} style={menuSectionWrapperStyles}>
        {/* Menu Section Content */}
        <li
          className={menuClasses.menuSectionContent}
          style={{ ...menuSectionContentStyles, ...(toggleProps.role && { cursor: 'pointer' }) }}
          {...toggleProps}
        >
          {icon && (
            <StyledMenuIcon className={menuClasses.icon} rootStyles={getMenuSectionStyles('icon')}>
              {icon}
            </StyledMenuIcon>
          )}
          {prefix && (
            <StyledMenuPrefix
              isCollapsed={isCollapsed}
              className={menuClasses.prefix}
              rootStyles={getMenuSectionStyles('prefix')}
            >
              {prefix}
            </StyledMenuPrefix>
          )}
          {collapsedMenuSectionLabel && isCollapsed && !isHovered ? (
            <StyledMenuSectionLabel
              isCollapsed={isCollapsed}
              isHovered={isHovered}
              className={menuClasses.menuSectionLabel}
              rootStyles={getMenuSectionStyles('label')}
              textTruncate={textTruncate}
            >
              {collapsedMenuSectionLabel}
            </StyledMenuSectionLabel>
          ) : (
            label && (
              <StyledMenuSectionLabel
                isCollapsed={isCollapsed}
                isHovered={isHovered}
                className={menuClasses.menuSectionLabel}
                rootStyles={getMenuSectionStyles('label')}
                textTruncate={textTruncate}
              >
                {label}
              </StyledMenuSectionLabel>
            )
          )}
          {suffix && (
            <StyledMenuSuffix
              isCollapsed={isCollapsed}
              className={menuClasses.suffix}
              rootStyles={getMenuSectionStyles('suffix')}
            >
              {suffix}
            </StyledMenuSuffix>
          )}
          {toggleProps.role && (
            // order: 1 puts the chevron after the ::after divider line
            <i
              className={open ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}
              style={{ order: 1, fontSize: '1rem' }}
              aria-hidden
            />
          )}
        </li>
        {/* Render Child */}
        {showChildren && children}
      </ul>
    </StyledVerticalMenuSection>
  );
};

export default forwardRef<HTMLLIElement, MenuSectionProps>(MenuSection);
