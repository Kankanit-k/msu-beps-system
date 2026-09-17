// University-admin page. Lives under /admin/university/... (universityAdmin tier).
// Access is enforced in src/middleware.ts via src/configs/accessControl.ts.
import Settings from '@/views/settings/Settings';

const SettingsPage = () => {
  return <Settings />;
};

export default SettingsPage;
