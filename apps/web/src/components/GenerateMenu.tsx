// React Imports
import type { ReactElement, ReactNode } from 'react';

// MUI Imports
import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';

// Type Imports
import type {
  VerticalMenuDataType,
  VerticalSectionDataType,
  VerticalSubMenuDataType,
  VerticalMenuItemDataType,
  HorizontalMenuDataType,
  HorizontalSubMenuDataType,
  HorizontalMenuItemDataType,
} from '@/types/menuTypes';

// Component Imports
import {
  SubMenu as HorizontalSubMenu,
  MenuItem as HorizontalMenuItem,
} from '@menu/horizontal-menu';
import {
  SubMenu as VerticalSubMenu,
  MenuItem as VerticalMenuItem,
  MenuSection,
} from '@menu/vertical-menu';
import MenuIcon from '@components/MenuIcon';

// Vertical menu icons: กล่องสีแบบการ์ด KPI (ไอคอน Remix `ri-…`) — อย่างอื่นถือเป็นอีโมจิ
const renderVerticalIcon = (icon?: string, color?: string): ReactElement | null =>
  icon ? <MenuIcon icon={icon} color={color} /> : null;

// Generate a menu from the menu data array
export const GenerateVerticalMenu = ({ menuData }: { menuData: VerticalMenuDataType[] }) => {
  // nested = อยู่ในเมนูย่อย → ไม่วาดกล่องไอคอน ให้ Menu ใส่จุดวงกลมแทน (แบบ Materio)
  const renderMenuItems = (data: VerticalMenuDataType[], nested = false): ReactNode[] => {
    // Use the map method to iterate through the array of menu data
    return data.map((item: VerticalMenuDataType, index) => {
      const menuSectionItem = item as VerticalSectionDataType;
      const subMenuItem = item as VerticalSubMenuDataType;
      const menuItem = item as VerticalMenuItemDataType;

      // Check if the current item is a section
      if (menuSectionItem.isSection) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { children, isSection, defaultOpen, label, ...sectionRest } = menuSectionItem;

        return (
          <MenuSection key={index} {...sectionRest} label={menuSectionItem.label}>
            {menuSectionItem.children && renderMenuItems(menuSectionItem.children)}
          </MenuSection>
        );
      }

      // Check if the current item is a sub menu
      if (subMenuItem.children) {
        const { children, icon, iconColor, prefix, suffix, ...rest } = subMenuItem;

        const Icon = renderVerticalIcon(icon, iconColor);

        const subMenuPrefix: ReactNode =
          prefix && (prefix as ChipProps).label ? (
            <Chip size="small" {...(prefix as ChipProps)} />
          ) : (
            (prefix as ReactNode)
          );

        const subMenuSuffix: ReactNode =
          suffix && (suffix as ChipProps).label ? (
            <Chip size="small" {...(suffix as ChipProps)} />
          ) : (
            (suffix as ReactNode)
          );

        // If it is, return a SubMenu component and call generateMenu with the current subMenuItem's children
        return (
          <VerticalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
            {children && renderMenuItems(children, true)}
          </VerticalSubMenu>
        );
      }

      // If the current item is neither a section nor a sub menu, return a MenuItem component
       
      const { label, icon, iconColor, prefix, suffix, ...rest } = menuItem;

      // Localize the href
      const href = rest.href;

      const Icon = nested ? null : renderVerticalIcon(icon, iconColor);

      const menuItemPrefix: ReactNode =
        prefix && (prefix as ChipProps).label ? (
          <Chip size="small" {...(prefix as ChipProps)} />
        ) : (
          (prefix as ReactNode)
        );

      const menuItemSuffix: ReactNode =
        suffix && (suffix as ChipProps).label ? (
          <Chip size="small" {...(suffix as ChipProps)} />
        ) : (
          (suffix as ReactNode)
        );

      return (
        <VerticalMenuItem
          // key ตาม href — key ตาม index ทำให้สถานะ active ค้างผิดรายการเมื่อเมนูเปลี่ยนตามบทบาทหลังโหลด
          key={href ?? index}
          prefix={menuItemPrefix}
          suffix={menuItemSuffix}
          {...rest}
          href={href}
          {...(Icon && { icon: Icon })}
        >
          {label}
        </VerticalMenuItem>
      );
    });
  };

  return <>{renderMenuItems(menuData)}</>;
};

// Generate a menu from the menu data array
export const GenerateHorizontalMenu = ({ menuData }: { menuData: HorizontalMenuDataType[] }) => {
  // Hooks

  const renderMenuItems = (data: HorizontalMenuDataType[]) => {
    // Use the map method to iterate through the array of menu data
    return data.map((item: HorizontalMenuDataType, index) => {
      const subMenuItem = item as HorizontalSubMenuDataType;
      const menuItem = item as HorizontalMenuItemDataType;

      // Check if the current item is a sub menu
      if (subMenuItem.children) {
        const { children, icon, prefix, suffix, ...rest } = subMenuItem;

        const Icon = icon ? <i className={icon} /> : null;

        const subMenuPrefix: ReactNode =
          prefix && (prefix as ChipProps).label ? (
            <Chip size="small" {...(prefix as ChipProps)} />
          ) : (
            (prefix as ReactNode)
          );

        const subMenuSuffix: ReactNode =
          suffix && (suffix as ChipProps).label ? (
            <Chip size="small" {...(suffix as ChipProps)} />
          ) : (
            (suffix as ReactNode)
          );

        // If it is, return a SubMenu component and call generateMenu with the current subMenuItem's children
        return (
          <HorizontalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
            {children && renderMenuItems(children)}
          </HorizontalSubMenu>
        );
      }

      // If the current item is not a sub menu, return a MenuItem component
      const { label, icon, prefix, suffix, ...rest } = menuItem;

      // Localize the href
      const href = rest.href;

      const Icon = icon ? <i className={icon} /> : null;

      const menuItemPrefix: ReactNode =
        prefix && (prefix as ChipProps).label ? (
          <Chip size="small" {...(prefix as ChipProps)} />
        ) : (
          (prefix as ReactNode)
        );

      const menuItemSuffix: ReactNode =
        suffix && (suffix as ChipProps).label ? (
          <Chip size="small" {...(suffix as ChipProps)} />
        ) : (
          (suffix as ReactNode)
        );

      return (
        <HorizontalMenuItem
          key={index}
          prefix={menuItemPrefix}
          suffix={menuItemSuffix}
          {...rest}
          href={href}
          {...(Icon && { icon: Icon })}
        >
          {label}
        </HorizontalMenuItem>
      );
    });
  };

  return <>{renderMenuItems(menuData)}</>;
};
