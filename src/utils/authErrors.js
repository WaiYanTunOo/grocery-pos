const FIREBASE_AUTH_MESSAGES = {
  'auth/operation-not-allowed': {
    title: 'Firebase Email/Password provider မဖွင့်ထားပါ',
    body:
      'Firebase Console > Authentication > Sign-in method ထဲမှာ Email/Password provider ကို Enable လုပ်ပြီး Save နှိပ်ရန်လိုပါသည်။',
    action: 'Provider ဖွင့်ပြီးနောက် app ကို refresh လုပ်ပါ။'
  },
  PASSWORD_LOGIN_DISABLED: {
    title: 'Firebase Email/Password provider မဖွင့်ထားပါ',
    body:
      'ဒီ Firebase project မှာ password login disabled ဖြစ်နေပါတယ်။ Authentication > Sign-in method > Email/Password ကို Enable လုပ်ပါ။',
    action: 'Firebase Console မှာဖွင့်ပြီးနောက် preview ကို refresh လုပ်ပါ။'
  },
  'auth/invalid-credential': {
    title: 'Email သို့မဟုတ် password မမှန်ပါ',
    body: 'အသုံးပြုသူအကောင့်ရှိ/မရှိနှင့် password ကိုပြန်စစ်ပါ။',
    action: 'မရှိသေးပါက အကောင့်အသစ်ဖန်တီးပါ။'
  },
  'auth/email-already-in-use': {
    title: 'ဒီ email ဖြင့် အကောင့်ရှိပြီးသားပါ',
    body: 'Login mode သို့ပြောင်းပြီး ဝင်ကြည့်ပါ။',
    action: 'Password မေ့နေပါက Firebase Console မှ reset လုပ်နိုင်သည်။'
  },
  'auth/weak-password': {
    title: 'Password အားနည်းနေပါသည်',
    body: 'အနည်းဆုံး ၆ လုံးနှင့် ခန့်မှန်းရခက်သော password အသုံးပြုပါ။',
    action: 'နောက်တစ်ခုဖြင့် ပြန်ကြိုးစားပါ။'
  },
  'auth/network-request-failed': {
    title: 'Network ချိတ်ဆက်မှု မအောင်မြင်ပါ',
    body: 'Internet connection, VPN/proxy, Firebase project access ကိုစစ်ပါ။',
    action: 'Connection ပြန်ကောင်းပြီးနောက် ပြန်ကြိုးစားပါ။'
  },
  ADMIN_SETUP_CODE_REQUIRED: {
    title: 'Admin account ဖန်တီးရန် setup code လိုအပ်ပါသည်',
    body:
      'ဒီ project မှာ admin account ရှိပြီးသားဖြစ်နိုင်ပါတယ်။ Admin အသစ်ဖန်တီးရန် `.env` ထဲက VITE_MANAGER_SETUP_CODE နှင့်တူသော code ထည့်ပါ။',
    action: 'သို့မဟုတ် Firestore users/{uid} ထဲမှာ role ကို admin သို့ပြောင်းပါ။'
  }
};

export function formatAuthError(error) {
  const rawCode = error?.code || error?.message || '';
  const restCode = extractRestCode(error?.message);
  const match = FIREBASE_AUTH_MESSAGES[rawCode] || FIREBASE_AUTH_MESSAGES[restCode];

  if (match) {
    return {
      ...match,
      code: restCode || rawCode
    };
  }

  return {
    title: 'Authentication မအောင်မြင်ပါ',
    body: error?.message || 'မသိသော error တစ်ခု ဖြစ်သွားပါသည်။',
    action: 'Firebase configuration နှင့် account data ကိုပြန်စစ်ပါ။',
    code: rawCode || 'unknown'
  };
}

function extractRestCode(message = '') {
  if (message.includes('PASSWORD_LOGIN_DISABLED')) return 'PASSWORD_LOGIN_DISABLED';
  return '';
}
