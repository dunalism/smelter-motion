# Aturan Pembaruan `project-context.md`

Setelah menyelesaikan task, SEBELUM menandai selesai, periksa apakah ada:
keputusan teknis penting, konvensi baru, jebakan baru, perubahan alur
arsitektur lintas file, atau perubahan status. Jika tidak ada, JANGAN ubah file.

Jika ada, perbarui `project-context.md`:

- Catat hanya keputusan, konvensi, jebakan, dan status.
- Jangan menambahkan daftar file, fungsi, tipe, atau angka.
- Edit bagian yang relevan dan hapus info usang, jangan hanya menambah di akhir file.
- Jaga file di bawah ~60 baris. Jika melebihi, ringkas dulu sebelum menambah.
- Jika file bertentangan dengan kode, percayai kode lalu perbaiki file.

## Keputusan

- Tulis alasan hanya dari pertimbangan di task ini (pilih A dibanding B karena apa).
- Jika alasan tidak diketahui, tulis `[alasan: tidak diketahui]`. Jangan menebak.
- Jika hanya dugaan dari git log atau komentar kode, beri label `[dugaan dari git log]`.

## Jebakan

- Tambahkan hanya jika memenuhi ketiganya: tidak terlihat dari membaca satu
  file, gagalnya diam-diam (tanpa error), dan melibatkan banyak file atau
  urutan wajib.
- Utamakan jebakan yang lahir dari bug nyata: setelah memperbaiki bug yang
  penyebabnya tidak jelas dari kode, catat jika bisa terulang.
- Verifikasi ke kode sebelum menyimpan. Jangan mencatat hal yang sudah
  ditangani langsung oleh kode atau cukup ditulis sebagai komentar di kode.

## Pesan penutup

Sebutkan apa yang diubah di `project-context.md`, atau tulis
"project-context.md tidak perlu diperbarui".
