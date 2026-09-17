'use client';

// React Imports
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

// Third-party Imports
import styled from '@emotion/styled';

// Type Imports
import type { VerticalNavContextProps } from '@menu/contexts/verticalNavContext';

// Config Imports
import themeConfig from '@configs/themeConfig';

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav';
import { useSettings } from '@core/hooks/useSettings';

type LogoTextProps = {
  isHovered?: VerticalNavContextProps['isHovered'];
  isCollapsed?: VerticalNavContextProps['isCollapsed'];
  transitionDuration?: VerticalNavContextProps['transitionDuration'];
  isBreakpointReached?: VerticalNavContextProps['isBreakpointReached'];
  color?: CSSProperties['color'];
};

// Collapsible text block (title + subtitle) that hides when the nav is collapsed.
const LogoText = styled.div<LogoTextProps>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: ${({ transitionDuration }) =>
    `margin-inline-start ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`};

  ${({ isHovered, isCollapsed, isBreakpointReached }) =>
    !isBreakpointReached && isCollapsed && !isHovered
      ? 'opacity: 0; margin-inline-start: 0;'
      : 'opacity: 1; margin-inline-start: 10px;'}
`;

// Stacked one word per line ("MAHASARAKHAM" / "UNIVERSITY") with tight line spacing.
const LogoEyebrow = styled.span`
  display: flex;
  flex-direction: column;
  color: var(--mui-palette-primary-main);
  font-size: 0.6rem;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

const LogoTitle = styled.span<{ color?: CSSProperties['color'] }>`
  color: ${({ color }) => color ?? 'var(--mui-palette-text-primary)'};
  font-family:
    var(--font-heading-latin), var(--font-heading-thai), 'Manrope', 'IBM Plex Sans Thai', sans-serif;
  font-size: 1.0625rem;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
`;

const LogoSubtitle = styled.span`
  color: var(--mui-palette-text-secondary);
  font-size: 0.6875rem;
  line-height: 1.4;
  font-weight: 500;
  white-space: nowrap;
`;

// "MSU-BEPS" → "MSU-" in the default title color, "BEPS" picked out in the accent color.
const splitTemplateName = (name: string): [string, string | null] => {
  const dashIndex = name.indexOf('-');

  if (dashIndex === -1) {
    return [name, null];
  }

  return [name.slice(0, dashIndex + 1), name.slice(dashIndex + 1)];
};

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  // Refs
  const logoTextRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { isHovered, transitionDuration, isBreakpointReached } = useVerticalNav();
  const { settings } = useSettings();

  // Vars
  const { layout } = settings;

  useEffect(() => {
    if (layout !== 'collapsed') {
      return;
    }

    if (logoTextRef && logoTextRef.current) {
      if (!isBreakpointReached && layout === 'collapsed' && !isHovered) {
        logoTextRef.current?.classList.add('hidden');
      } else {
        logoTextRef.current.classList.remove('hidden');
      }
    }
  }, [isHovered, layout, isBreakpointReached]);

  return (
    <div className="flex items-center min-bs-[24px]">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: 42,
          blockSize: 42,
          flexShrink: 0,
          padding: 4,
          borderRadius: 8,
          background: '#fff',
          boxShadow: '0 0 0 1px rgba(15,23,42,0.06)',
        }}
      >
        {/* Plain <img> (served from public/) — avoids next/image basePath issues */}
        <img
          src={`${process.env.NEXT_PUBLIC_BASEPATH ?? ''}/images/logos/msu.jpg`}
          alt={themeConfig.templateName}
          style={{ objectFit: 'contain', blockSize: 34, inlineSize: 'auto' }}
        />
      </span>
      <LogoText
        ref={logoTextRef}
        isHovered={isHovered}
        isCollapsed={layout === 'collapsed'}
        transitionDuration={transitionDuration}
        isBreakpointReached={isBreakpointReached}
      >
        {themeConfig.templateEyebrow ? (
          <LogoEyebrow>
            {themeConfig.templateEyebrow.split(' ').map((word) => (
              <span key={word}>{word}</span>
            ))}
          </LogoEyebrow>
        ) : null}
        <LogoTitle color={color}>
          {(() => {
            const [prefix, accent] = splitTemplateName(themeConfig.templateName);

            return accent ? (
              <>
                {prefix}
                <span style={{ color: '#2F5FE0' }}>{accent}</span>
              </>
            ) : (
              prefix
            );
          })()}
        </LogoTitle>
        {themeConfig.templateSubtitleTh ?? themeConfig.templateSubtitle ? (
          <LogoSubtitle>{themeConfig.templateSubtitleTh ?? themeConfig.templateSubtitle}</LogoSubtitle>
        ) : null}
      </LogoText>
    </div>
  );
};

export default Logo;
