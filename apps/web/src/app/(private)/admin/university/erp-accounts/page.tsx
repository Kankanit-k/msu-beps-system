// University-admin page. Lives under /admin/university/... (universityAdmin tier).
// Access is enforced in src/middleware.ts via src/configs/accessControl.ts.
import ErpAccounts from '@/views/erp-accounts/ErpAccounts';

const ErpAccountsPage = () => {
  return <ErpAccounts />;
};

export default ErpAccountsPage;
