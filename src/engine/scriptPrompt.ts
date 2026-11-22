import { SEO_METADATA_RULES } from './seoPrompt';

export interface ScriptPromptInput {
  topic: string;
  styleTone: string;
  styleName: string;
  styleNuance: string;
  styleCardPrompt: string;
  targetDurationSec: number;
  sceneCount?: number;
  aspectRatio: string;
  dims: string;
  paletteColors: {
    bg?: string;
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
  };
}

export const SCRIPT_SYSTEM_INSTRUCTION =
  'Hasilkan JSON valid sesuai skema. Tulis narasi voiceover Bahasa Indonesia yang sangat manusiawi, mengalir seperti orang ngobrol langsung ke teman (bukan bahasa AI/poster/terjemahan kaku), dan buat kode JS di field `code` yang ringkas, jelas, bebas error sintaks, serta mematuhi kartu gaya visual & aturan faceless.';

export const NARRATION_WRITING_RULES = `## Cara menulis narasi (paling penting)
Tulis seperti orang yang NGOMONG LANGSUNG ke temannya, bukan seperti poster kata-kata mutiara. Bayangkan seluruh narasi dibaca sekali jalan tanpa melihat layar: harus terdengar seperti satu cerita utuh yang mengalir, jelas maksudnya, dan enak didengar.
- Tulis dulu narasinya sebagai satu monolog utuh di kepala, baru dipotong per scene di jeda napas yang wajar. Scene boleh berisi potongan kalimat yang dilanjutkan scene berikutnya.
- Panjang teks per scene: 4-12 kata. Ritmenya cepat, tapi tetap kalimat yang lengkap dan jelas. Kata tunggal ("Sekarang.") hanya sesekali untuk penekanan, maksimal 1-2 kali per video.
- Bahasa lisan anak muda yang natural: boleh "kamu", "gak", "udah", "aja", "kok", "sih", "tuh", "kan", "ya", "jujur", "padahal". Pakai kata sambung (karena, tapi, padahal, terus, makanya, jadi) supaya antar-scene nyambung.
- Bahasa SEDERHANA, langsung dipahami sekali dengar oleh siapa saja (anak SMP sampai orang tua). Tes: kalau ada kata yang jarang dipakai di obrolan warung kopi, ganti.
- Pakai kata sehari-hari yang biasa diucapkan di obrolan. JANGAN pakai kata tinggi/serapan/akademis: esensi, eksistensi, paradigma, manifestasi, resiliensi, validasi, ekspektasi, transformasi, signifikan, fundamental, kontemplasi, hakikat, entitas, persepsi, narasi, fase, momentum, versi terbaik, potensi, makna hidup. Ganti dengan kata biasa (mis. "ekspektasi" -> "harapan", "konsisten" -> "terus-terusan", "validasi" -> "pengakuan orang").
- JANGAN puitis, filosofis, atau berbunga-bunga ("jiwa yang lelah", "langkah kecil menuju cahaya", "dirimu yang sejati"). Katakan maksudnya langsung.
- Satu kalimat satu maksud, pendek, susunan biasa (subjek-kata kerja-objek). Hindari kalimat bertingkat dan kiasan di dalam kiasan.
- Metafora boleh, tapi bendanya sehari-hari dan artinya langsung dijelaskan dengan kata biasa; penonton tidak boleh harus mikir untuk paham.
- Konkret, bukan abstrak. Ganti kata besar ("kesuksesan", "potensi", "versi terbaik dirimu", "zona nyaman") dengan situasi nyata yang bisa dibayangkan: jam berapa, lagi ngapain, pegang apa, ngerasa apa.
- Jaga satu benang merah: metafora dari ide dipakai dari awal sampai akhir dan dijelaskan dengan jelas, bukan disebut sekilas lalu ditinggal.
- JANGAN: deretan slogan pendek tanpa hubungan, kalimat perintah beruntun ("Bangkit! Lawan! Gas!"), kalimat ala terjemahan, kata baku kaku ("adalah", "merupakan", "oleh karena itu", "sesungguhnya", "dirimu"), atau quote klise.
- Alur: hook yang langsung kena -> situasi nyata yang relatable -> sudut pandang baru (lewat metafora) -> satu langkah konkret yang bisa dilakukan hari ini -> penutup yang membekas dan bikin orang pengen langsung gerak.
- Struktur penahan penonton (berlaku di atas alur tadi, tanpa mengubah jenis videonya):
  * Hook: scene pertama, paling lama sekitar 10% durasi video dan maksimal 12 kata. Langsung sebut topiknya + apa yang dipertaruhkan buat penonton (apa yang didapat atau hilang), objek utamanya langsung bergerak.
  * Lock-in: scene tepat setelah hook menegaskan janji hook dan memberi alasan untuk bertahan sampai akhir: satu bukti atau situasi singkat, atau "ada N hal/cara/langkah..." kalau isinya berupa daftar. Kalau cerita: pertegas apa yang dipertaruhkan tokohnya. Video 4 scene atau kurang boleh menggabungkannya dengan hook.
  * Kalau ada beberapa poin, alasan, atau fakta yang urutannya bebas: taruh yang terkuat KEDUA di awal, dan yang TERKUAT jadi klimaks menjelang akhir. Langkah yang harus berurutan dan alur cerita tetap mengikuti urutan logisnya.
  * Rehook: di peralihan ke bagian berikutnya, pakai kalimat penghubung yang bikin penasaran lagi (mis. "tapi justru di sini masalahnya,", "dan yang terakhir ini paling sering dilupain:"). Cukup 1-3 kali per video, di peralihan yang penting saja, harus terdengar alami, bukan template.
  * Penutup: satu kalimat yang merangkum pesannya + ajakan yang menyatu dengan isi, dengan "duration" scene terakhir minimal 2 detik supaya ajakannya sempat terbaca.

Contoh beda kaku vs natural (jangan dipakai mentah-mentah, hanya untuk rasa bahasa):
- Kaku: "Berhenti menunda." / "Waktu terus berjalan." / "Mulai sekarang." / "Raih mimpimu."
- Terlalu tinggi: "Esensi perjalanan ini bukan tentang destinasi, melainkan transformasi dirimu." -> Sederhana: "Yang penting bukan cepat sampai. Tapi kamu jadi lebih kuat di jalan."
- Natural: "Kamu bilang besok aja," / "padahal kemarin juga bilang gitu." / "Masalahnya bukan kamu malas," / "tapi langkah pertamanya kegedean." / "Jadi kecilin aja:" / "buka laptopnya dulu. Itu doang."`;

export function buildScriptGenerationPrompt(input: ScriptPromptInput): string {
  const styleSection = input.styleCardPrompt
    ? `GAYA VIDEO & ANIMASI AKTIF (${input.styleName}):
Nuansa: ${input.styleNuance || input.styleTone}
${input.styleCardPrompt}`
    : `Gaya & Nada: ${input.styleTone}`;

  const hookMaxSec = Math.min(4, Math.max(1.5, Number((input.targetDurationSec * 0.1).toFixed(1))));
  const minSceneCount = Math.max(1, Math.ceil(input.targetDurationSec / 4));
  const recommendedSceneCount =
    input.sceneCount && input.sceneCount >= minSceneCount
      ? input.sceneCount
      : Math.max(minSceneCount, Math.round(input.targetDurationSec / 3.2));

  return `Kamu adalah sutradara & penulis skrip video motion graphics pendek berbahasa Indonesia.
Buatkan rancangan skrip video motion yang menarik, padat, dan memikat untuk topik:
"${input.topic.trim()}"

${styleSection}
Gaya Penyampaian Tambahan: ${input.styleTone} (tetap patuhi bahasa lisan natural di bawah, jangan berubah jadi bahasa baku/AI).
Target Durasi Total: sekitar ${input.targetDurationSec} detik, dibagi otomatis menjadi sekitar ${recommendedSceneCount} scene (minimal ${minSceneCount} scene).
ATURAN WAJIB DURASI SCENE: Setiap scene WAJIB berdurasi maksimal 4.0 detik (rentang 1.5 - 4.0 detik, DILARANG keras membuat scene lebih dari 4.0 detik). Pecah penjelasan ke jumlah scene yang cukup agar setiap scene tetap padat dan berdurasi <= 4.0 detik.
Dimensi Canvas: ${input.dims} (${input.aspectRatio}). Latar Kanvas: "${input.paletteColors.bg || '#060913'}", Primary: "${input.paletteColors.primary || '#29e7ff'}", Secondary: "${input.paletteColors.secondary || '#b26bff'}", Accent: "${input.paletteColors.accent || '#ff3fd1'}", Text: "${input.paletteColors.text || '#ffffff'}".

${NARRATION_WRITING_RULES}

Untuk setiap scene, buat:
1. title: Judul singkat scene (contoh: "Hook: Langkah Kegedean")
2. narration: Kalimat narasi voiceover Bahasa Indonesia sepanjang 4-12 kata sesuai seluruh aturan "Cara menulis narasi" di atas agar terasa seperti satu monolog ngobrol yang nyambung dari scene 1 sampai terakhir.
3. emphasis: 1-2 kata kunci terpenting dari \`narration\` scene ini yang paling ingin ditegaskan (harus persis ada di dalam teks \`narration\`, mis. "overthinking" atau "mulai dulu"). Kata ini akan otomatis digarisbawahi pada subtitle.
4. visualBrief: Deskripsi detail objek grafis, ilustrasi/tipografi, kata kunci visual singkat (1-3 kata saja, BUKAN kalimat narasi/subtitle), dan animasi yang terjadi sesuai kartu gaya di atas. (Bila ada tokoh/orang, wajib faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah).
5. cameraHint: Arahan gerakan kamera (pan/zoom) yang lembut dan tetap terpusat (zoom 0.94-1.05) agar tidak ada objek atau kata yang terpotong di tepi layar.
6. durationSec: Durasi scene dalam detik. WAJIB maksimal 4.0 detik per scene (rentang 1.5 - 4.0 detik, DILARANG > 4.0 detik). Scene 1 (Hook) singkat sekitar ${hookMaxSec} detik (maks ~10% total durasi, maks 4.0 detik), scene terakhir minimal 2.0 detik dan maksimal 4.0 detik agar ajakan penutup sempat terbaca, dan total seluruh scene mendekati ${input.targetDurationSec} detik.
7. code: Kode JavaScript Canvas Motion DSL siap jalan yang menggambar visualBrief scene ini menggunakan API objek \`s\` (dan \`ctx\`):
   - ATURAN WAJIB ANTI-TERPOTONG (SEMUA GAYA): Tempatkan semua objek & teks di area aman (x antara 8%..92% lebar kanvas, y antara 10%..76% tinggi kanvas). Gunakan \`s.kamera\` dengan \`zoom\` aman \`0.94..1.05\` dan fokus dekat pusat kanvas agar TIDAK ADA kata, huruf, atau objek yang terpotong!
   - ATURAN WAJIB ANTI-SUBTITLE-GANDA (SEMUA GAYA): Sistem sudah merender subtitle otomatis di area bawah (y >= 78% tinggi kanvas). DILARANG KERAS menggambar subtitle, teks narasi lengkap, atau kotak/kapsul subtitle sendiri di dalam \`code\` pada gaya apa pun! Teks dalam \`code\` hanya untuk label/kata kunci visual singkat (1-3 kata).
   - ATURAN ROTASI: \`rotate\` pada \`s.group\` memakai RADIAN (mis. \`0.03\` rad = ~1.7°; JANGAN pakai angka derajat seperti \`3\` atau \`45\`), dan JANGAN membalik teks hingga terbalik.
   - s.kamera([[0, cx, cy, 1], [dur, cx2, cy2, zoom]])
   - s.sfx("ding"|"glitch"|"laser"|"tick"|"beep"|"sparkle"|"whoosh"|"pop"|"thud"|"stamp"|"impact", waktu, 0.55)
   - s.group({ x?, y?, scale?, rotate?, alpha? }, () => { ... })
   - s.rect(x, y, w, h, { fill?, stroke?, width?, alpha?, draw?, radius?, wobble?, hatch? })
   - s.circle(x, y, r, { fill?, stroke?, width?, alpha?, draw?, wobble?, hatch? })
   - s.ellipse(x, y, rx, ry, { fill?, stroke?, width?, alpha?, draw?, rotate?, wobble?, hatch? })
   - s.arc(x, y, r, a0, a1, { stroke?, width?, alpha?, draw? })
   - s.line(x1, y1, x2, y2, { stroke?, width?, alpha?, draw?, dash?, wobble? })
   - s.polyline([[x, y], ...], { stroke?, width?, alpha?, fill?, draw?, close?, wobble?, hatch? })
   - s.box3d(x, y, w, h, depth, { fill?, shade?, top?, edges?: "none"|string, width?, wobble?, hatch?, alpha? })
   - s.text(str, x, y, { size?, color?, align?, alpha?, weight?, font? })
   - s.text3d(str, x, y, { size?, color?, side?, depth?, serif?, condensed?, align?, alpha? })
   - s.sparkle(x, y, size, { stroke?, fill?, alpha? }), s.burst(x, y, r, { draw?, count?, stroke? })
   - Helper Belah Warna (jika gaya Belah Warna): s.field(a, b), s.both(a, b, (main, shade, back) => ...), s.slab(x, y, w, h, d, r, main, shade), s.disc(x, y, r, main, back), s.word(str, x, y, size, progress)
   - s.ease.back(u), s.ease.sharp(u), s.ease.smooth(u), s.spring(startTime, "smooth"|"heavy"|"snappy"|"bouncy"|"fast"), s.stagger(i, start, step, preset), s.keys([[t, v], ...]), s.at(start, dur), s.wave(freq, amp), s.lerp(a, b, t), s.rand(seed), s.t.
   Awali setiap code dengan komentar // ===== SCENE N ===== di baris sendiri dan jangan pakai import/export.

Selain \`title\` dan \`scenes\`, buat juga objek \`seo\` berdasarkan seluruh naskah yang sudah disusun:
${SEO_METADATA_RULES}`;
}
