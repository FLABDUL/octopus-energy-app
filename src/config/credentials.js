/**
 * Default credentials loaded from environment variables
 * These are used to pre-populate the dashboard form
 * 
 * Add your credentials to .env.local file:
 * - VITE_OCTOPUS_API_KEY=your_key_here
 * - VITE_ANTHROPIC_API_KEY=your_key_here
 * - VITE_ACCOUNT_NUMBER=your_account_number
 * - VITE_ELECTRIC_MPAN=your_mpan
 * - VITE_ELECTRIC_SERIAL=your_serial
 * - VITE_GAS_MPRN=your_mprn
 * - VITE_GAS_SERIAL=your_serial
 */

export const defaultCredentials = {
  octopusApiKey: import.meta.env.VITE_OCTOPUS_API_KEY || '',
  openaiApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  accountNumber: import.meta.env.VITE_ACCOUNT_NUMBER || '',
  electricMpan: import.meta.env.VITE_ELECTRIC_MPAN || '',
  electricSerial: import.meta.env.VITE_ELECTRIC_SERIAL || '',
  gasMprn: import.meta.env.VITE_GAS_MPRN || '',
  gasSerial: import.meta.env.VITE_GAS_SERIAL || ''
};
