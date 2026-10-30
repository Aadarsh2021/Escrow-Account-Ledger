export type AccountType = 'regular' | 'ca';

export const checkIsRegularUser = (user?: any, profile?: any): boolean => {
  // 1. Explicit account_type check
  const explicitType = 
    profile?.account_type || 
    user?.user_metadata?.account_type;

  if (explicitType === 'regular') return true;
  if (explicitType === 'ca') return false;

  // 2. Default fallback check for Loffers DTF account
  return (
    user?.id === '7c30d63e-7bc3-44cf-bbe0-eb463f8b86a7' ||
    user?.email?.toLowerCase() === 'dtfsurat@gmail.com' ||
    user?.email?.toLowerCase().includes('loffer') ||
    profile?.company_name?.toLowerCase() === 'loffers dtf' ||
    profile?.company_name?.toLowerCase().includes('loffer') ||
    false
  );
};
