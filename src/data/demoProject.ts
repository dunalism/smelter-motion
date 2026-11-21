import type { ProjectState } from '../types/studio';

export const SCENE_4_CODE = `// ===== SCENE 4 =====
s.kamera([
  [0, 360, 620, 1],
  [2.35, 360, 445, 1.12],
  [2.95, 360, 445, 1.12],
  [4.16, 360, 445, 1.12]
]);

s.sfx("glitch", 1.18, 0.55);
s.sfx("glitch", 2.12, 0.4);
s.sfx("ding", 2.92, 0.65);

const C = "#29e7ff";
const V = "#b26bff";
const M = "#ff3fd1";

// SET: ruang kendali holografik
s.group({ alpha: 0.32 }, () => {
  s.polyline([[-70, 135], [100, 92], [360, 125], [620, 92], [790, 135]], {
    stroke: V, width: 2, alpha: 0.48
  });
  s.polyline([[-70, 170], [105, 125], [360, 155], [615, 125], [790, 170]], {
    stroke: C, width: 1.2, alpha: 0.32
  });

  for (let side = 0; side < 2; side++) {
    const x = side === 0 ? 38 : 682;
    s.polyline([[x, 130], [x, 950], [x + (side === 0 ? 38 : -38), 1010]], {
      stroke: V, width: 2, alpha: 0.5
    });
    s.line(x + (side === 0 ? 20 : -20), 180, x + (side === 0 ? 20 : -20), 780, {
      stroke: C, width: 1, alpha: 0.35
    });
    s.rect(x + (side === 0 ? 12 : -72), 250, 60, 150, {
      stroke: V, width: 1.5, alpha: 0.38
    });
    s.line(x + (side === 0 ? 22 : -62), 285, x + (side === 0 ? 62 : -22), 285, {
      stroke: C, width: 1, alpha: 0.35
    });
    s.line(x + (side === 0 ? 22 : -62), 315, x + (side === 0 ? 52 : -32), 315, {
      stroke: C, width: 1, alpha: 0.35
    });
    s.circle(x + (side === 0 ? 42 : -42), 445 + s.wave(0.7, 3, side), 3, {
      fill: C, stroke: "none", alpha: 0.65
    });
  }

  s.polyline([[85, 690], [85, 210], [160, 175]], {
    stroke: C, width: 1.5, alpha: 0.25
  });
  s.polyline([[635, 690], [635, 210], [560, 175]], {
    stroke: C, width: 1.5, alpha: 0.25
  });

  // Lantai perspektif, dijaga tenang di area subtitle
  for (let i = -6; i <= 6; i++) {
    s.line(360, 945, 360 + i * 74, 1290, {
      stroke: C, width: 1, alpha: 0.17
    });
  }
  for (let i = 0; i < 5; i++) {
    const y = 970 + i * 75;
    s.line(-80, y, 800, y, {
      stroke: V, width: 1, alpha: 0.15
    });
  }
});

// Sisa garis lurus dari scene sebelumnya menjadi jalur masuk sinyal
const trace = s.spring(0.12, "smooth");
s.line(80, 430, 170, 430, {
  stroke: C, width: 2, draw: trace, alpha: 0.75
});
s.line(170, 430, 205, 430, {
  stroke: C, width: 1.5, alpha: 0.3
});

// Gauge HUD mengitari objek utama
const gaugeIn = s.spring(0.2, "smooth");
s.circle(360, 430, 244, {
  stroke: V, width: 1.5, alpha: 0.25 * gaugeIn
});
s.circle(360, 430, 224, {
  stroke: C, width: 1, alpha: 0.24 * gaugeIn
});

for (let i = 0; i < 18; i++) {
  const a = s.t * 0.32 + i * Math.PI * 2 / 18;
  s.arc(360, 430, 244, a, a + 0.105, {
    stroke: i % 3 === 0 ? M : C,
    width: i % 3 === 0 ? 2.5 : 1.5,
    alpha: 0.65 * gaugeIn
  });
}

s.text("SYS.THINK / 04", 135, 205, {
  size: 18, color: C, alpha: s.at(0.35, 0.3), align: "left"
});
s.text("SIGNAL ANALYSIS", 585, 205, {
  size: 16, color: V, alpha: s.at(0.55, 0.3), align: "right"
});

// Kotak hologram masuk, lalu mengalami gangguan sinyal
const enter = s.spring(0.12, "heavy");
const clean = s.spring(2.78, "smooth");
const noise = s.keys([[0.75, 0], [1.05, 1], [2.72, 1], [2.98, 0]]);

const frame = Math.floor(s.t * 27);
const jitterX = (s.rand(frame + 31) - 0.5) * 24 * noise;
const jitterY = (s.rand(frame + 73) - 0.5) * 16 * noise;
const shake = Math.sin(s.t * 43) * 8 * noise;

s.group({
  x: 360 + s.lerp(115, 0, enter) + jitterX + shake,
  y: 430 + jitterY,
  scale: s.lerp(0.86, 1, enter),
  rotate: Math.sin(s.t * 37) * 0.025 * noise
}, () => {
  // Bidang hologram ungu
  s.rect(-190, -105, 380, 210, {
    fill: "rgba(178,107,255,0.045)",
    stroke: V,
    width: 2.5,
    draw: enter,
    alpha: 1 - clean
  });
  s.rect(-178, -93, 356, 186, {
    stroke: M,
    width: 1,
    draw: enter,
    alpha: 0.5 * (1 - clean)
  });

  // Garis pemindai di dalam kotak
  const scanY = -86 + ((s.t * 0.65) % 1) * 172;
  s.line(-170, scanY, 170, scanY, {
    stroke: M, width: 1.5, alpha: 0.42 * (1 - clean)
  });

  // Teks mengalami pergeseran acak beberapa frame
  const textX = (s.rand(frame + 103) - 0.5) * 34 * noise;
  const textY = (s.rand(frame + 151) - 0.5) * 16 * noise;
  const ghostX = (s.rand(frame + 199) - 0.5) * 20 * noise;

  s.text("ERR??", textX, textY, {
    size: 67,
    color: M,
    align: "center",
    alpha: 1 - clean
  });
  s.text("ERR??", textX + ghostX, textY - 3, {
    size: 67,
    color: V,
    align: "center",
    alpha: 0.32 * noise * (1 - clean)
  });

  // Garis pengunci sinyal saat gangguan mulai reda
  s.rect(-190, -105, 380, 210, {
    stroke: C, width: 3, draw: clean, alpha: clean
  });
  s.rect(-178, -93, 356, 186, {
    stroke: C, width: 1, draw: clean, alpha: 0.65 * clean
  });

  s.text("OK", 0, 1, {
    size: 76,
    color: C,
    align: "center",
    alpha: clean
  });
});

// Bracket pengunci empat sudut
const lock = s.spring(2.78, "smooth");
const bx = s.lerp(220, 202, lock);
const by = s.lerp(135, 120, lock);

for (let sx of [-1, 1]) {
  for (let sy of [-1, 1]) {
    const x = 360 + sx * bx;
    const y = 430 + sy * by;
    s.polyline([
      [x - sx * 25, y],
      [x, y],
      [x, y - sy * 25]
    ], {
      stroke: C, width: 2.5, draw: lock, alpha: 0.85
    });
  }
}

// Garis scan terus bergerak sepanjang scene
const scanLineY = 310 + ((s.t * 0.72) % 1) * 240;
s.line(135, scanLineY, 585, scanLineY, {
  stroke: C, width: 1.2, alpha: 0.28 * gaugeIn
});

s.text(clean > 0.6 ? "SYS.STABLE" : "SYS.RETRY", 135, 615, {
  size: 17,
  color: clean > 0.6 ? C : M,
  align: "left",
  alpha: 0.65
});
s.text("LINK " + (clean > 0.6 ? "00.1" : "ERR.7"), 585, 615, {
  size: 17, color: C, align: "right", alpha: 0.6
});

s.sparkle(565, 330 + s.wave(1.2, 5), 9, {
  stroke: C, alpha: 0.7 * s.at(2.85, 0.5)
});
s.sparkle(155, 520 + s.wave(1.4, 4), 6, {
  stroke: V, alpha: 0.6 * s.at(1.1, 0.4)
});`;

export const SCENE_5_CODE = `// ===== SCENE 5 =====
s.kamera([
  [0, 360, 620, 1],
  [0.3, 195, 440, 1.12],
  [1.5, 420, 450, 1.06],
  [2.6, 470, 450, 1.17],
  [3.35, 455, 450, 1.12],
  [4.6, 455, 450, 1.12]
]);

s.sfx("laser", 2.62, 0.55);
s.sfx("tick", 3.2, 0.55, 1.3);
s.sfx("ding", 3.55, 0.55);

const C = "#29e7ff";
const V = "#b26bff";
const M = "#ff3fd1";

// SET: ruang arsip dan pemeriksaan data holografik
s.group({ alpha: 0.3 }, () => {
  s.polyline([[-70, 120], [130, 80], [360, 120], [590, 80], [790, 120]], {
    stroke: V, width: 2, alpha: 0.45
  });
  s.line(-50, 170, 770, 170, {
    stroke: C, width: 1, alpha: 0.25
  });

  // Rak arsip hologram di sisi ruangan
  for (let side = 0; side < 2; side++) {
    const x = side === 0 ? 30 : 690;
    const dir = side === 0 ? 1 : -1;

    s.rect(x, 210, dir * 105, 430, {
      stroke: V, width: 1.6, alpha: 0.38
    });
    for (let j = 0; j < 5; j++) {
      const y = 250 + j * 74;
      s.line(x + dir * 12, y, x + dir * 90, y, {
        stroke: C, width: 1, alpha: 0.35
      });
      s.line(x + dir * 12, y + 22, x + dir * (47 + (j % 3) * 12), y + 22, {
        stroke: V, width: 1, alpha: 0.27
      });
    }

    s.line(x + dir * 15, 185, x + dir * 15, 920, {
      stroke: C, width: 1, alpha: 0.25
    });
  }

  s.polyline([[105, 690], [105, 230], [155, 195]], {
    stroke: C, width: 1.5, alpha: 0.24
  });
  s.polyline([[615, 690], [615, 230], [565, 195]], {
    stroke: C, width: 1.5, alpha: 0.24
  });

  // Lantai perspektif
  for (let i = -6; i <= 6; i++) {
    s.line(360, 950, 360 + i * 76, 1290, {
      stroke: C, width: 1, alpha: 0.16
    });
  }
  for (let i = 0; i < 5; i++) {
    s.line(-80, 970 + i * 74, 800, 970 + i * 74, {
      stroke: V, width: 1, alpha: 0.14
    });
  }
});

// Cincin bersegmen kedua masuk dari kanan
const ringIn = s.spring(0.08, "heavy");
const ringX = s.lerp(850, 165, ringIn);
const ringY = 430 + s.wave(0.8, 5);

s.group({
  x: ringX,
  y: ringY,
  scale: s.lerp(0.72, 1, ringIn),
  rotate: s.lerp(0.25, 0, ringIn)
}, () => {
  s.circle(0, 0, 104, {
    stroke: V, width: 1.5, alpha: 0.5
  });
  s.circle(0, 0, 82, {
    stroke: V, width: 1.2, alpha: 0.3
  });

  for (let i = 0; i < 14; i++) {
    const a = s.t * 0.28 + i * Math.PI * 2 / 14;
    s.arc(0, 0, 92, a, a + 0.24, {
      stroke: i % 3 === 0 ? C : V,
      width: i % 3 === 0 ? 3 : 2,
      alpha: 0.9 * ringIn
    });
  }

  s.text("02", 0, 0, {
    size: 57, color: V, align: "center", alpha: ringIn
  });

  const dotA = s.t * 1.1;
  s.circle(Math.cos(dotA) * 110, Math.sin(dotA) * 110, 4, {
    fill: C, stroke: "none", alpha: 0.9 * ringIn
  });
});

s.text("SEQUENCE / 02", 105, 245, {
  size: 17, color: V, align: "left", alpha: s.at(0.3, 0.3)
});
s.text("QUESTION MODE", 615, 245, {
  size: 16, color: C, align: "right", alpha: s.at(1.2, 0.35)
});

// Dokumen hologram masuk dari bawah dan terbuka
const docIn = s.spring(0.62, "heavy");

s.group({
  x: 465,
  y: 455 + s.lerp(125, 0, docIn),
  scale: s.lerp(0.9, 1, docIn),
  alpha: docIn
}, () => {
  // Rangka halaman
  s.rect(-158, -205, 316, 410, {
    fill: "rgba(41,231,255,0.025)",
    stroke: C, width: 2, draw: docIn
  });
  s.rect(-147, -194, 294, 388, {
    stroke: V, width: 1, alpha: 0.45
  });

  // Sudut halaman
  for (let sx of [-1, 1]) {
    for (let sy of [-1, 1]) {
      const x = sx * 148;
      const y = sy * 195;
      s.polyline([
        [x - sx * 18, y],
        [x, y],
        [x, y - sy * 18]
      ], {
        stroke: C, width: 2, alpha: 0.8
      });
    }
  }

  s.text("CASE.FILE / 02", -116, -158, {
    size: 17, color: V, align: "left"
  });
  s.line(-116, -130, 116, -130, {
    stroke: C, width: 1.5, alpha: 0.7, draw: docIn
  });

  // Baris-baris isi dokumen hadir berurutan
  for (let i = 0; i < 8; i++) {
    const k = s.stagger(i, 0.82, 0.115, "smooth");
    const y = -98 + i * 34;
    const length = 115 + (i % 3) * 34;

    s.rect(-117, y - 4, 8, 8, {
      stroke: i % 3 === 0 ? M : C,
      width: 1.2,
      alpha: k
    });
    s.line(-98, y, -98 + length, y, {
      stroke: C, width: 2, draw: k, alpha: 0.82
    });
    s.line(-98, y + 9, -98 + length * 0.62, y + 9, {
      stroke: V, width: 1.1, draw: k, alpha: 0.48
    });
  }

  s.line(-116, 177, 116, 177, {
    stroke: V, width: 1, alpha: 0.4
  });
  s.text("DATA / PENDING", -112, 190, {
    size: 15, color: C, align: "left", alpha: 0.72
  });
});

// Kaca pembesar menyapu isi dokumen
const magIn = s.spring(1.3, "smooth");
const sweep = s.spring(1.82, "smooth");
const mx = s.lerp(290, 535, sweep);
const my = 435 + s.wave(1.15, 5);

s.group({ alpha: 0.7 * magIn }, () => {
  // Garis scan magenta tertinggal di belakang lensa
  s.line(315, my, mx - 72, my, {
    stroke: M, width: 2, alpha: 0.72 * magIn
  });
  s.line(mx, 315, mx, 590, {
    stroke: M, width: 1.4, alpha: 0.34 * magIn
  });
});

s.group({
  x: mx,
  y: my,
  scale: s.lerp(0.72, 1, magIn),
  rotate: -0.16 + s.wave(0.7, 0.018)
}, () => {
  // Lensa wireframe
  s.circle(0, 0, 72, {
    fill: "rgba(41,231,255,0.035)",
    stroke: C, width: 3, alpha: magIn
  });
  s.circle(0, 0, 62, {
    stroke: C, width: 1, alpha: 0.58 * magIn
  });
  s.ellipse(0, 0, 48, 18, {
    stroke: V, width: 1.2, alpha: 0.4 * magIn
  });

  // Pantulan dan garis bidik
  s.line(-50, -45, 50, 45, {
    stroke: C, width: 1, alpha: 0.42 * magIn
  });
  s.line(-72, 0, 72, 0, {
    stroke: M, width: 1.5, alpha: 0.65 * magIn
  });
  s.line(0, -72, 0, 72, {
    stroke: M, width: 1, alpha: 0.5 * magIn
  });

  // Gagang menyatu dengan bingkai lensa
  s.line(52, 52, 112, 112, {
    stroke: C, width: 13, alpha: magIn
  });
  s.line(52, 52, 112, 112, {
    stroke: V, width: 2, alpha: magIn
  });
  s.circle(52, 52, 7, {
    stroke: C, width: 2, alpha: magIn
  });
});

// HUD pemindaian aktif
const hud = s.spring(0.45, "smooth");
s.circle(465, 455, 220, {
  stroke: C, width: 1, alpha: 0.18 * hud
});

for (let i = 0; i < 4; i++) {
  const a = s.t * 0.45 + i * Math.PI / 2;
  s.arc(465, 455, 212, a, a + 0.19, {
    stroke: i % 2 === 0 ? M : C,
    width: 2,
    alpha: 0.65 * hud
  });
}

s.text("SCAN.ACTIVE", 465, 690, {
  size: 17, color: M, align: "center", alpha: magIn
});

s.sparkle(550, 340, 8, {
  stroke: C, alpha: 0.7 * s.at(2.55, 0.3)
});
s.sparkle(380, 605, 7, {
  stroke: V, alpha: 0.6 * s.at(3.1, 0.3)
});`;

export const SCENE_6_CODE = `// ===== SCENE 6 =====
s.kamera([
  [0, 360, 625, 1],
  [1.12, 475, 420, 1.17],
  [1.72, 410, 460, 1.08],
  [2.42, 360, 515, 1],
  [3.74, 360, 515, 1]
]);

s.sfx("beep", 1.2, 0.55);
s.sfx("glitch", 2.46, 0.6);
s.sfx("sparkle", 3.2, 0.45);

const C = "#29e7ff";
const V = "#b26bff";
const M = "#ff3fd1";

// SET: ruang arsip data dengan layar-layar di dinding
s.group({ alpha: 0.3 }, () => {
  s.polyline([[-70, 125], [120, 85], [360, 122], [600, 85], [790, 125]], {
    stroke: V, width: 2, alpha: 0.48
  });
  s.line(-70, 165, 790, 165, {
    stroke: C, width: 1, alpha: 0.28
  });

  // Panel dinding samping
  for (let side = 0; side < 2; side++) {
    const x = side === 0 ? 48 : 672;
    const dir = side === 0 ? 1 : -1;
    s.rect(x, 210, dir * 72, 460, {
      stroke: V, width: 1.5, alpha: 0.4
    });
    for (let j = 0; j < 4; j++) {
      const y = 260 + j * 90;
      s.rect(x + dir * 12, y, dir * 48, 42, {
        stroke: C, width: 1, alpha: 0.3
      });
      s.line(x + dir * 18, y + 14, x + dir * 42, y + 14, {
        stroke: V, width: 1, alpha: 0.35
      });
      s.circle(x + dir * 30, y + 30 + s.wave(0.6, 2, j), 2.5, {
        fill: C, stroke: "none", alpha: 0.55
      });
    }
  }

  s.polyline([[105, 710], [105, 230], [155, 190]], {
    stroke: C, width: 1.4, alpha: 0.22
  });
  s.polyline([[615, 710], [615, 230], [565, 190]], {
    stroke: C, width: 1.4, alpha: 0.22
  });

  // Lantai holografik
  for (let i = -6; i <= 6; i++) {
    s.line(360, 950, 360 + i * 76, 1290, {
      stroke: C, width: 1, alpha: 0.16
    });
  }
  for (let i = 0; i < 5; i++) {
    s.line(-80, 975 + i * 74, 800, 975 + i * 74, {
      stroke: V, width: 1, alpha: 0.14
    });
  }
});

// Layar utama masuk dengan daftar data
const panelIn = s.spring(0.12, "heavy");
const scatterAlpha = s.keys([[0, 1], [2.4, 1], [3.52, 0]], "in");

s.group({
  x: 360,
  y: 460 + s.lerp(115, 0, panelIn),
  scale: s.lerp(0.88, 1, panelIn),
  alpha: panelIn
}, () => {
  // Panel layar
  s.rect(-250, -220, 500, 440, {
    fill: "rgba(41,231,255,0.025)",
    stroke: C, width: 2, draw: panelIn
  });
  s.rect(-239, -209, 478, 418, {
    stroke: V, width: 1, alpha: 0.45
  });

  // Detail sudut layar
  for (let sx of [-1, 1]) {
    for (let sy of [-1, 1]) {
      const x = sx * 245;
      const y = sy * 215;
      s.polyline([
        [x - sx * 23, y],
        [x, y],
        [x, y - sy * 23]
      ], {
        stroke: C, width: 2, alpha: 0.85
      });
    }
  }

  s.text("ARCHIVE / CLAIMS", -210, -180, {
    size: 18, color: C, align: "left"
  });
  s.line(-210, -157, 210, -157, {
    stroke: V, width: 1.2, alpha: 0.55
  });

  // Kolom status bukti
  s.rect(70, -137, 145, 66, {
    fill: "rgba(255,63,209,0.045)",
    stroke: M, width: 2, alpha: s.at(1.12, 0.25)
  });

  const evidenceOn = s.at(1.13, 0.24);
  const blink = 0.28 + 0.72 * Math.abs(Math.sin(s.t * 12));

  s.text("BUKTI: 0", 142, -104, {
    size: 24,
    color: M,
    align: "center",
    alpha: evidenceOn * blink
  });

  s.text("RECORDS", -208, -120, {
    size: 15, color: V, align: "left", alpha: 0.7
  });

  // Daftar garis teks. Setiap baris terpecah menjadi fragmen.
  for (let i = 0; i < 8; i++) {
    const rowY = -74 + i * 36;
    const rowLength = 250 + (i % 3) * 38;
    const rowK = s.stagger(i, 0.35, 0.12, "smooth");

    // Penanda kecil di depan setiap baris
    s.rect(-211, rowY - 4, 7, 7, {
      stroke: i % 2 === 0 ? C : V,
      width: 1.2,
      alpha: rowK * scatterAlpha
    });

    for (let j = 0; j < 6; j++) {
      const seed = i * 31 + j * 7;
      const baseX = -195 + j * (rowLength / 6);
      const baseY = rowY;
      const fragmentLength = rowLength / 6 * 0.76;

      const angle = s.rand(seed) * Math.PI * 2;
      const distance = 24 + s.rand(seed + 1) * 115;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const fly = s.spring(2.42 + s.rand(seed + 2) * 0.13, "snappy");

      s.line(
        baseX + dx * fly,
        baseY + dy * fly,
        baseX + fragmentLength + dx * fly,
        baseY + dy * fly,
        {
          stroke: j % 3 === 0 ? V : C,
          width: 2,
          alpha: rowK * scatterAlpha
        }
      );
    }

    s.line(-194, rowY + 10, -194 + rowLength * 0.52, rowY + 10, {
      stroke: V,
      width: 1,
      alpha: rowK * 0.42 * scatterAlpha
    });
  }

  // Label sistem tetap stabil ketika isi data menghilang
  s.line(-210, 190, 210, 190, {
    stroke: C, width: 1, alpha: 0.4
  });
  s.text("DATA INTEGRITY / NULL", -207, 204, {
    size: 15, color: V, align: "left", alpha: 0.66
  });
});

// Partikel cyan terlepas dari daftar setelah klaim tidak memiliki bukti
const particleFade = s.keys([[2.38, 0], [2.55, 1], [3.55, 0]], "inOut");

for (let i = 0; i < 26; i++) {
  const seed = i * 13 + 9;
  const row = i % 8;
  const col = Math.floor(i / 8);
  const startX = 175 + (i % 7) * 38;
  const startY = 386 + row * 24 + col * 9;

  const angle = s.rand(seed) * Math.PI * 2;
  const distance = 35 + s.rand(seed + 1) * 155;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;
  const fly = s.spring(2.43 + s.rand(seed + 2) * 0.18, "snappy");

  s.circle(
    startX + dx * fly,
    startY + dy * fly,
    2 + s.rand(seed + 3) * 2.2,
    {
      fill: C,
      stroke: "none",
      alpha: particleFade * 0.9
    }
  );
}

// Retakan energi singkat saat daftar pecah
const burst = s.at(2.42, 0.55);
s.burst(360, 460, 215, {
  draw: burst,
  count: 22,
  stroke: C
});

// Indikator nol tetap berkedip saat layar mulai kosong
const statusPulse = 0.35 + 0.65 * Math.abs(Math.sin(s.t * 10));
s.circle(560, 300, 5, {
  fill: M,
  stroke: "none",
  alpha: statusPulse * s.at(1.15, 0.3)
});
s.circle(560, 300, 13 + Math.sin(s.t * 4) * 3, {
  stroke: M,
  width: 1.2,
  alpha: 0.5 * statusPulse
});

// Garis scan dan bracket HUD menjaga layar tetap hidup
const scanY = 265 + ((s.t * 0.68) % 1) * 390;
s.line(105, scanY, 615, scanY, {
  stroke: C, width: 1.2, alpha: 0.3
});

const hudIn = s.spring(0.35, "smooth");
for (let sx of [-1, 1]) {
  for (let sy of [-1, 1]) {
    const x = 360 + sx * 275;
    const y = 460 + sy * 238;
    s.polyline([
      [x - sx * 18, y],
      [x, y],
      [x, y - sy * 18]
    ], {
      stroke: V, width: 2, alpha: 0.65 * hudIn
    });
  }
}

s.text("SYS.ARCHIVE", 115, 215, {
  size: 17, color: C, align: "left", alpha: 0.65
});
s.text("VERIFY / 00", 605, 215, {
  size: 17, color: M, align: "right", alpha: 0.65
});

s.sparkle(150, 650 + s.wave(1.1, 4), 7, {
  stroke: C, alpha: 0.7 * s.at(2.9, 0.3)
});
s.sparkle(575, 670 + s.wave(0.9, 5), 6, {
  stroke: V, alpha: 0.6 * s.at(3.1, 0.3)
});`;

export const DEMO_PROJECT: ProjectState = {
  title: 'Mengapa Sinyal Informasi Sering Menipu?',
  topic: 'Cara memverifikasi klaim dan data di era kecerdasan buatan agar tidak terjebak ilusi',
  styleTone: 'Edukasi Futuristik & Investigasi',
  targetDurationSec: 12.5,
  aspectRatio: '9:16',
  paletteId: 'cyber-hologram',
  subtitles: {
    enabled: true,
    fontSize: 28,
    position: 'bottom',
    style: 'kotak_gelap',
  },
  scenes: [
    {
      id: 'scene-4',
      index: 0,
      title: 'Scene 4 — Analisis Sinyal & Koreksi Error',
      narration: 'Awalnya sinyal tampak kacau dan penuh gangguan, sebelum sistem berhasil menguncinya menjadi stabil.',
      emphasis: 'kacau',
      visualBrief: 'Ruang kendali holografik, kotak ERR?? bergetar lalu terkunci menjadi OK dengan sudut bracket cyan.',
      cameraHint: 'Mulai wide di tengah lalu zoom 1.12x fokus ke kotak hologram.',
      durationSec: 4.16,
      code: SCENE_4_CODE,
      audio: { sourceType: 'none' },
    },
    {
      id: 'scene-5',
      index: 1,
      title: 'Scene 5 — Pemeriksaan Berkas & Mode Pertanyaan',
      narration: 'Langkah kedua, periksa setiap baris arsip dengan cermat menggunakan pemindai bukti aktif.',
      emphasis: 'pemindai bukti',
      visualBrief: 'Cincin 02 masuk dari kanan, dokumen CASE.FILE terbuka baris demi baris, kaca pembesar menyapu isi.',
      cameraHint: 'Pan kiri ke cincin 02, lalu geser kanan ke dokumen dan zoom ke lensa pemindai.',
      durationSec: 4.6,
      code: SCENE_5_CODE,
      audio: { sourceType: 'none' },
    },
    {
      id: 'scene-6',
      index: 2,
      title: 'Scene 6 — Klaim Tanpa Bukti (BUKTI: 0)',
      narration: 'Dan jika tidak ada bukti pendukung, seluruh klaim itu seketika terpecah menjadi fragmen kosong.',
      emphasis: 'fragmen kosong',
      visualBrief: 'Layar ARCHIVE / CLAIMS menunjukkan BUKTI: 0 berkedip, daftar baris meledak jadi partikel cyan.',
      cameraHint: 'Zoom ke indikator BUKTI: 0 lalu tarik mundur saat fragmen data meledak.',
      durationSec: 3.74,
      code: SCENE_6_CODE,
      audio: { sourceType: 'none' },
    },
  ],
  seo: {
    primaryKeyword: 'cara cek fakta ai',
    secondaryKeywords: ['verifikasi informasi ai', 'sinyal informasi menipu', 'literasi digital'],
    title: 'Cara Cek Fakta AI Biar Nggak Ketipu Informasi Palsu 🔍',
    description:
      'Bingung membedakan fakta dan klaim palsu dari AI? Pelajari cara cek fakta AI lewat alur verifikasi sinyal dan bukti yang cepat.\n\nDi video ini:\n✅ Kenapa sinyal informasi awal sering terlihat kacau\n💡 Langkah memeriksa arsip dengan pemindai bukti\n🎬 Cara mengenali klaim kosong tanpa data pendukung\n\nPernah ketemu info AI yang terdengar meyakinkan tapi ternyata salah? Tulis pengalamanmu di kolom komentar!',
    short: 'Kelihatan meyakinkan belum tentu benar. Begini cara cek klaim AI dalam 12 detik! 🔍',
    tags: [
      'cara cek fakta ai',
      'verifikasi informasi ai',
      'literasi digital indonesia',
      'cara cek berita hoaks',
      'halusinasi ai',
      'edukasi teknologi',
      'fakta atau hoaks',
      'cara bedakan informasi valid',
      'belajar literasi data',
      'tips anti hoaks',
    ],
    hashtags: [
      '#cekfaktaai',
      '#literasidigital',
      '#verifikasidata',
      '#edukasiteknologi',
      '#antihoaks',
    ],
  },
};
