export type TtsModelId = 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts';
export type VoiceGender = 'female' | 'male';

export interface TtsModelOption {
  id: TtsModelId;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
}

export interface TtsVoicePreset {
  id: string;
  name: string;
  gender: VoiceGender;
  speakingStyle: string;
  bestFor: string;
  sampleText: string;
  defaultStylePrompt: string;
}

export const TTS_MODELS: TtsModelOption[] = [
  {
    id: 'gemini-3.8-flash-tts',
    label: 'Gemini 3.8 Flash TTS',
    shortLabel: 'flash-tts',
    badge: 'Ekspresif & Natural',
    description:
      'Kualitas vokal paling ekspresif dengan intonasi alami, jeda napas realistis, dan kontrol gaya bicara mendalam.',
  },
  {
    id: 'gemini-3.8-flash-lite-tts',
    label: 'Gemini 3.8 Flash Lite TTS',
    shortLabel: 'flash-lite-tts',
    badge: 'Cepat & Ringan',
    description:
      'Latensi rendah dan proses generate lebih cepat, ideal untuk uji coba naskah atau render banyak scene sekaligus.',
  },
];

export const TTS_VOICES: TtsVoicePreset[] = [
  // ================= SUARA WANITA (10) =================
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    speakingStyle: 'Tegas, jernih, dan penuh kepastian',
    bestFor: 'Hook pembuka yang langsung menohok, fakta mengejutkan, dan edukasi investigatif.',
    sampleText: 'Kamu sering bilang besok aja, padahal kemarin juga bilangnya persis kayak gitu.',
    defaultStylePrompt: 'Tegas, jernih, ritme cepat dan meyakinkan seperti narator video edukasi modern',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    speakingStyle: 'Cerah, segar, dan lincah',
    bestFor: 'Penjelasan teknologi sehari-hari, tips praktis, dan konten edukasi bernuansa positif.',
    sampleText: 'Cuma butuh tiga menit buat ngecek beritanya asli atau cuma editan AI.',
    defaultStylePrompt: 'Cerah, segar, ramah, dan energik untuk penjelasan praktis berbahasa Indonesia',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    speakingStyle: 'Santai, mengalir, dan natural seperti ngobrol',
    bestFor: 'Storytelling kasual ke teman, cerita pengalaman nyata, dan narasi tanpa kesan kaku.',
    sampleText: 'Jujur deh, pernah gak sih kamu buka HP niatnya lima menit, tau-tau udah sejam?',
    defaultStylePrompt: 'Santai, akrab, dan natural seperti teman yang sedang bercerita langsung',
  },
  {
    id: 'Leda',
    name: 'Leda',
    gender: 'female',
    speakingStyle: 'Muda, antusias, dan bertempo cepat',
    bestFor: 'Reels/TikTok anak muda, tren media sosial, dan topik produktivitas kekinian.',
    sampleText: 'Jangan langsung percaya yang viral, karena algoritma cuma ngejar klik doang!',
    defaultStylePrompt: 'Muda, bersemangat, cepat, dan ekspresif untuk konten pendek dinamis',
  },
  {
    id: 'Sulafat',
    name: 'Sulafat',
    gender: 'female',
    speakingStyle: 'Hangat, akrab, dan dekat di telinga',
    bestFor: 'Cerita keseharian yang menyentuh, topik kebiasaan hidup, dan pesan penutup yang mengena.',
    sampleText: 'Yang bikin capek tuh bukan kerjaannya, tapi rasa bersalah karena terus menunda.',
    defaultStylePrompt: 'Hangat, tulus, dan empatik seperti berbicara pelan dengan sahabat dekat',
  },
  {
    id: 'Despina',
    name: 'Despina',
    gender: 'female',
    speakingStyle: 'Halus, rapi, dan tenang mengalir',
    bestFor: 'Esai visual minimalis, ulasan desain/karya, dan video bernuansa kontemplatif ringan.',
    sampleText: 'Coba perhatiin mejamu sekarang, satu benda kecil aja bisa ngubah fokus seharian.',
    defaultStylePrompt: 'Halus, tenang, teratur, dan enak didengar dengan tempo stabil',
  },
  {
    id: 'Erinome',
    name: 'Erinome',
    gender: 'female',
    speakingStyle: 'Artikulasi tajam, bersih, dan terstruktur',
    bestFor: 'Video daftar langkah ("ada 3 cara..."), tutorial singkat, dan penjelasan data/angka.',
    sampleText: 'Ada dua hal kecil yang sering kelewat waktu kamu lagi baca grafik berita.',
    defaultStylePrompt: 'Jelas, presisi, dan terstruktur untuk menjelaskan poin demi poin',
  },
  {
    id: 'Gacrux',
    name: 'Gacrux',
    gender: 'female',
    speakingStyle: 'Matang, berwibawa, dan berkarakter dalam',
    bestFor: 'Dokumenter arsip sejarah, pembahasan ekonomi/keuangan, dan topik serius yang berbobot.',
    sampleText: 'Dari catatan tahun 1920 ini, kita bisa lihat pola yang ternyata keulang lagi sekarang.',
    defaultStylePrompt: 'Matang, berwibawa, tenang, dan serius layaknya narator dokumenter arsip',
  },
  {
    id: 'Vindemiatrix',
    name: 'Vindemiatrix',
    gender: 'female',
    speakingStyle: 'Lembut, pelan, dan menenangkan',
    bestFor: 'Refleksi diri, cerita malam hari, dan narasi yang memberi ruang napas penonton.',
    sampleText: 'Gak semua hal harus kamu selesain hari ini, cukup satu langkah kecil dulu.',
    defaultStylePrompt: 'Lembut, hangat, pelan, dan menenangkan tanpa terdengar tergesa-gesa',
  },
  {
    id: 'Callirrhoe',
    name: 'Callirrhoe',
    gender: 'female',
    speakingStyle: 'Luwes, ringan, dan ekspresif',
    bestFor: 'Narasi kasual gaya obrolan warung kopi, fakta unik sehari-hari, dan cerita lucu.',
    sampleText: 'Lucunya ya, kita sering beli barang mahal cuma biar kelihatan sibuk dan keren.',
    defaultStylePrompt: 'Luwes, santai, sedikit jenaka, dan sangat natural seperti obrolan sehari-hari',
  },

  // ================= SUARA PRIA (10) =================
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    speakingStyle: 'Lincah, antusias, dan membakar semangat',
    bestFor: 'Pembuka hook cepat, fakta sains/teknologi seru, dan video motivasi bertempo cepat.',
    sampleText: 'Tunggu dulu! Otak kita tuh gampang banget ketipu sama angka yang kelihatan rapi.',
    defaultStylePrompt: 'Antusias, lincah, penuh energi, dan ekspresif untuk menarik perhatian sejak detik pertama',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    speakingStyle: 'Informatif, mantap, dan terpercaya',
    bestFor: 'Investigasi AI/data, bedah kasus teknologi, dan penjelasan fakta di balik layar.',
    sampleText: 'Di balik jawaban AI yang terdengar yakin, sering ada tebakan yang gak berdasar.',
    defaultStylePrompt: 'Informatif, tenang, tajam, dan investigatif seperti host dokumenter teknologi',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    speakingStyle: 'Bertenaga, berapi-api, dan dramatis',
    bestFor: 'Klimaks cerita, video tantangan aksi nyata, dan penutup yang bikin orang langsung gerak.',
    sampleText: 'Masalahnya bukan kamu malas, tapi langkah pertamanya aja yang kegedean. Kecilin sekarang!',
    defaultStylePrompt: 'Kuat, penuh gairah, energik, dan membakar semangat tanpa kaku',
  },
  {
    id: 'Orus',
    name: 'Orus',
    gender: 'male',
    speakingStyle: 'Tegas, lugas, dan padat',
    bestFor: 'Opini tajam, reel editorial kontras tinggi, dan sanggahan mitos populer.',
    sampleText: 'Bukan soal jam kerjanya yang kurang, tapi fokusmu yang kepotong tiap lima menit.',
    defaultStylePrompt: 'Tegas, lugas, padat, dan langsung ke inti pembicaraan',
  },
  {
    id: 'Iapetus',
    name: 'Iapetus',
    gender: 'male',
    speakingStyle: 'Jernih, netral, dan mudah dipahami',
    bestFor: 'Penjelasan cara kerja mesin/sistem, tutorial praktis, dan edukasi umum semua usia.',
    sampleText: 'Cara kerjanya mirip saringan kopi: yang kasar ditahan, yang bersih baru lewat.',
    defaultStylePrompt: 'Jernih, rapi, netral, dan bersahabat untuk menjelaskan konsep rumit jadi sederhana',
  },
  {
    id: 'Algieba',
    name: 'Algieba',
    gender: 'male',
    speakingStyle: 'Halus, hangat, dan berkelas',
    bestFor: 'Storytelling sinematik, kisah perjalanan tokoh/sejarah, dan narasi merek elegan.',
    sampleText: 'Di kota pelabuhan tua itu, satu catatan kecil ternyata ngubah arah perdagangan dunia.',
    defaultStylePrompt: 'Halus, dalam, berkelas, dan mengalir seperti pencerita film dokumenter',
  },
  {
    id: 'Umbriel',
    name: 'Umbriel',
    gender: 'male',
    speakingStyle: 'Santai, akrab, dan gaya obrolan teman',
    bestFor: 'Konten relatable sehari-hari, curhat ringan produktivitas, dan obrolan anak muda.',
    sampleText: 'Padahal kemarin baru janji mau tidur cepat, eh jam satu masih scroll juga kan.',
    defaultStylePrompt: 'Santai, rileks, dan natural seperti teman sebaya yang ngobrol di warung kopi',
  },
  {
    id: 'Enceladus',
    name: 'Enceladus',
    gender: 'male',
    speakingStyle: 'Intim, dekat, dan sedikit berbisik',
    bestFor: 'Pembuka misteri, fakta rahasia di balik layar, dan momen cerita yang bikin penasaran.',
    sampleText: 'Tapi ada satu detail kecil di pojok halaman itu yang sengaja gak pernah diceritain.',
    defaultStylePrompt: 'Intim, pelan, dekat ke mikrofon, dan memancing rasa penasaran',
  },
  {
    id: 'Alnilam',
    name: 'Alnilam',
    gender: 'male',
    speakingStyle: 'Berat, kokoh, dan meyakinkan',
    bestFor: 'Narasi sejarah kuno, arsip cetak, dan pembahasan mendalam yang butuh bobot suara.',
    sampleText: 'Tiga abad sebelum kompas modern ada, pelaut udah baca arah lewat batu ini.',
    defaultStylePrompt: 'Berat, mantap, tenang, dan berwibawa untuk topik sejarah dan analisis mendalam',
  },
  {
    id: 'Rasalgethi',
    name: 'Rasalgethi',
    gender: 'male',
    speakingStyle: 'Runtut, profesional, dan enak diikuti',
    bestFor: 'Rangkuman berita/riset, video penjelasan bisnis, dan edukasi terstruktur.',
    sampleText: 'Kalau diringkas jadi satu kalimat, biaya tersembunyinya selalu datang di bulan ketiga.',
    defaultStylePrompt: 'Profesional, runtut, jelas, dan tetap terdengar seperti bahasa lisan alami',
  },
];

export function resolveTtsModel(raw: unknown): TtsModelId {
  if (raw === 'gemini-3.8-flash-lite-tts' || raw === 'flash-lite-tts') {
    return 'gemini-3.8-flash-lite-tts';
  }
  return 'gemini-3.8-flash-tts';
}

export function resolveVoiceName(raw: unknown): string {
  if (typeof raw === 'string') {
    const found = TTS_VOICES.find((v) => v.id === raw.trim());
    if (found) return found.id;
  }
  return 'Kore';
}

export function getVoicePreset(voiceId: string): TtsVoicePreset {
  return TTS_VOICES.find((v) => v.id === voiceId) || TTS_VOICES[0];
}

export function filterVoicesByGender(gender: 'all' | VoiceGender): TtsVoicePreset[] {
  if (gender === 'all') return TTS_VOICES;
  return TTS_VOICES.filter((v) => v.gender === gender);
}
