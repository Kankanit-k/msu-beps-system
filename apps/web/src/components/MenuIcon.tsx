// ไอคอนเมนูแบบการ์ด KPI — กล่องมุมโค้งสีทึบ ไอคอน Remix สีขาว
// icon ที่ไม่ขึ้นต้นด้วย "ri-" ถือเป็นอีโมจิ (แสดงบนพื้นเทาอ่อนแบบเดิม)
const MenuIcon = ({
  icon,
  color = 'var(--mui-palette-primary-main)',
  size = 28,
}: {
  icon: string;
  color?: string;
  size?: number;
}) => {
  const ri = icon.startsWith('ri-');

  return (
    <span
      aria-hidden
      className="menu-icon-tile"
      style={{
        inlineSize: size,
        blockSize: size,
        borderRadius: size * 0.3,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size * 0.57,
        lineHeight: 1,
        color: '#fff',
        backgroundColor: ri ? color : 'var(--mui-palette-action-hover)',
        boxShadow: ri ? `0 2px 6px color-mix(in srgb, ${color} 35%, transparent)` : undefined,
      }}
    >
      {ri ? <i className={icon} style={{ fontSize: 'inherit' }} /> : icon}
    </span>
  );
};

export default MenuIcon;
