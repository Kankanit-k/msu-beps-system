// React Imports
import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

// Next Imports
import { usePathname } from 'next/navigation';

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

const collectHrefs = (items: VerticalMenuDataType[]): string[] =>
  items.flatMap((item) =>
    'children' in item && item.children
      ? collectHrefs(item.children)
      : 'href' in item && item.href
        ? [String(item.href)]
        : [],
  );

// Vertical menu icons: a Remix class (`ri-…`) renders as an icon-font glyph; anything else is
// treated as an emoji and shown inside a small rounded tile.
const renderVerticalIcon = (icon?: string): ReactElement | null => {
  if (!icon) return null;

  if (icon.startsWith('ri-')) return <i className={icon} />;

  return (
    <span
      aria-hidden
      style={{
        inlineSize: 28,
        blockSize: 28,
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        lineHeight: 1,
        backgroundColor: 'var(--mui-palette-action-hover)',
      }}
    >
      {icon}
    </span>
  );
};

// Sections start expanded (set `defaultOpen: false` to start one collapsed) and collapse/expand
// on heading click; the one holding the current page always reopens itself.
const CollapsibleSection = ({
  section,
  children,
}: {
  section: VerticalSectionDataType;
  children: ReactNode;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { children: items, isSection, defaultOpen, ...rest } = section;
  const pathname = (usePathname() ?? '').replace(/\/+$/, '') || '/';
  const hasActive = collectHrefs(items).some((href) => pathname === href);
  const [open, setOpen] = useState(defaultOpen ?? true);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <MenuSection {...rest} open={open} onToggle={() => setOpen((o) => !o)}>
      {children}
    </MenuSection>
  );
};

// Generate a menu from the menu data array
export const GenerateVerticalMenu = ({ menuData }: { menuData: VerticalMenuDataType[] }) => {
  // Hooks

  const renderMenuItems = (data: VerticalMenuDataType[]) => {
    // Use the map method to iterate through the array of menu data
    return data.map((item: VerticalMenuDataType, index) => {
      const menuSectionItem = item as VerticalSectionDataType;
      const subMenuItem = item as VerticalSubMenuDataType;
      const menuItem = item as VerticalMenuItemDataType;

      // Check if the current item is a section
      if (menuSectionItem.isSection) {
        return (
          <CollapsibleSection key={index} section={menuSectionItem}>
            {menuSectionItem.children && renderMenuItems(menuSectionItem.children)}
          </CollapsibleSection>
        );
      }

      // Check if the current item is a sub menu
      if (subMenuItem.children) {
        const { children, icon, prefix, suffix, ...rest } = subMenuItem;

        const Icon = renderVerticalIcon(icon);

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
            {children && renderMenuItems(children)}
          </VerticalSubMenu>
        );
      }

      // If the current item is neither a section nor a sub menu, return a MenuItem component
      const { label, icon, prefix, suffix, ...rest } = menuItem;

      // Localize the href
      const href = rest.href;

      const Icon = renderVerticalIcon(icon);

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
          key={index}
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
