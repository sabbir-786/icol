const user = (() => { try { return JSON.parse(localStorage.getItem('iicm_user')); } catch (e) { return null; } })();
if (!user || !localStorage.getItem('iicm_access_token') || user.role_code !== 'COMPANY_ADMIN') location.href = '../login/index.html';
