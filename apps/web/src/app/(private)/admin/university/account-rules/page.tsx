// University-admin page. Lives under /admin/university/... (universityAdmin tier).
// Access is enforced in src/middleware.ts via src/configs/accessControl.ts.
import AccountRules from '@/views/account-rules/AccountRules';

const AccountRulesPage = () => {
  return <AccountRules />;
};

export default AccountRulesPage;
