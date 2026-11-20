import { Question, Subject, OptionItem, MatchingPair } from '@/types/cbt';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Membersihkan format teks html sederhana jika ada di teks soal
 */
function cleanHtmlText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Generate skrip Google Apps Script (.gs) untuk membuat Google Form Kuis secara instan
 */
export function generateGoogleFormsAppsScript(subject: Subject, questions: Question[]): string {
  const cleanTitle = cleanHtmlText(subject.title || 'Ujian CBT');
  const cleanClass = subject.className || 'Semua Kelas';
  const duration = subject.durationMinutes || 90;

  // Header dan inisialisasi skrip
  let script = `/**
 * SKRIP PEMBUAT GOOGLE FORM OTOMATIS
 * Dihasilkan dari CBT Modern SMP Negeri 58 Palembang
 * Mata Pelajaran: ${cleanTitle} (${cleanClass})
 * Tanggal Generate: ${new Date().toLocaleString('id-ID')}
 * 
 * CARA MENGGUNAKAN:
 * 1. Buka https://script.new di browser Anda.
 * 2. Hapus seluruh teks bawaan di editor, lalu tempel (Paste) seluruh kode ini.
 * 3. Klik tombol "Simpan" (ikon disket) atau tekan Ctrl + S.
 * 4. Klik tombol "Jalankan" (Run). Jika muncul permintaan izin otorisasi Google,
 *    klik "Tinjau Izin" -> Pilih Akun Google Anda -> Lanjutan -> Buka (Tidak Aman) -> Izinkan.
 * 5. Google Form langsung otomatis selesai dibuat di Google Drive Anda!
 */

function buatGoogleFormUjian() {
  var namaForm = ${JSON.stringify(`${cleanTitle} - Kelas ${cleanClass}`)};
  var deskripsi = ${JSON.stringify(`Asesmen Berbasis Komputer (CBT) - SMP Negeri 58 Palembang\nMata Pelajaran: ${cleanTitle}\nKelas: ${cleanClass}\nDurasi Waktu: ${duration} Menit\nTotal Soal: ${questions.length} Butir\n\nPetunjuk: Pilihlah salah satu jawaban yang paling tepat. Kerjakan secara mandiri dan teliti.` )};

  // 1. Buat Formulir Baru
  var form = FormApp.create(namaForm);
  form.setDescription(deskripsi);
  form.setIsQuiz(true); // Aktifkan mode kuis nilai otomatis
  form.setAllowResponseEdits(false);
  form.setShuffleQuestions(false);

  // 2. Tambahkan Kolom Identitas Siswa
  var secIdentitas = form.addSectionHeaderItem();
  secIdentitas.setTitle("BAGIAN 1: IDENTITAS PESERTA UJIAN");

  var itemNama = form.addTextItem();
  itemNama.setTitle("Nama Lengkap Siswa").setRequired(true);

  var itemKelas = form.addTextItem();
  itemKelas.setTitle("Kelas").setRequired(true);

  var itemNoPeserta = form.addTextItem();
  itemNoPeserta.setTitle("Nomor Peserta / NISN / No. Absen").setRequired(true);

  var secSoal = form.addSectionHeaderItem();
  secSoal.setTitle("BAGIAN 2: BUTIR SOAL UJIAN");

`;

  // Iterasi seluruh butir soal
  questions.forEach((q, index) => {
    const qNum = index + 1;
    const qText = cleanHtmlText(q.questionText || `Soal Nomor ${qNum}`);
    const qType = q.type || 'Pilihan Ganda';

    // Bobot nilai / poin
    let points = 1;
    if (subject.scoringRules && subject.scoringRules[qType] !== undefined) {
      points = Number(subject.scoringRules[qType]) || 1;
    } else if (qType === 'Esai') {
      points = 5;
    } else if (qType === 'Pilihan Ganda Kompleks' || qType === 'Menjodohkan' || qType === 'Isian Singkat') {
      points = 2;
    }

    script += `  // --- Soal No. ${qNum} (${qType}) ---\n`;

    // Jika memiliki gambar mediaUrl
    if (q.mediaUrl && q.mediaUrl.startsWith('http')) {
      script += `  try {
    var imgBlob${qNum} = UrlFetchApp.fetch(${JSON.stringify(q.mediaUrl)}).getBlob();
    form.addImageItem().setImage(imgBlob${qNum}).setTitle("Gambar untuk Soal No. ${qNum}");
  } catch (errImg) {
    Logger.log("Gambar soal ${qNum} dilewati: " + errImg.message);
  }\n`;
    }

    switch (qType) {
      case 'Pilihan Ganda': {
        const options = (Array.isArray(q.options) ? q.options : []) as OptionItem[];
        script += `  var qItem${qNum} = form.addMultipleChoiceItem();
  qItem${qNum}.setTitle(${JSON.stringify(`${qNum}. ${qText}`)});
  qItem${qNum}.setPoints(${points});
  qItem${qNum}.setRequired(true);
  var choices${qNum} = [];
`;
        options.forEach((opt, optIdx) => {
          const optText = cleanHtmlText(opt.text || `Pilihan ${LETTERS[optIdx] || optIdx + 1}`);
          const letter = LETTERS[optIdx] || '';
          const isCorrect =
            (typeof q.answer === 'string' && q.answer.trim().toUpperCase() === letter) ||
            (typeof q.answer === 'string' && q.answer.trim() === optText.trim()) ||
            (Array.isArray(q.answer) && q.answer.includes(letter));

          script += `  choices${qNum}.push(qItem${qNum}.createChoice(${JSON.stringify(`${letter}. ${optText}`)}, ${isCorrect ? 'true' : 'false'}));\n`;
        });

        script += `  qItem${qNum}.setChoices(choices${qNum});\n\n`;
        break;
      }

      case 'Benar/Salah': {
        const statements = (Array.isArray(q.options) ? q.options : []) as any[];

        // Jika soal Benar/Salah berupa multi-pernyataan: gunakan Kisi Pilihan Ganda (GridItem)
        if (statements.length > 0) {
          const rows: string[] = statements.map((stmt, sIdx) => {
            const raw = cleanHtmlText(typeof stmt === 'string' ? stmt : (stmt?.text || stmt?.statement || stmt?.row || `Pernyataan ${sIdx + 1}`));
            // Hapus penomoran di awal agar tidak dobel dengan nomor baris otomatis Google Form
            const clean = raw.replace(/^(\d+[\.\)]\s*)+/, '').trim();
            return clean || raw;
          });

          // Parse kunci jawaban untuk dicatat di log guru
          let answersList: string[] = [];
          if (Array.isArray(q.answer)) {
            answersList = q.answer.map(a => String(a).trim());
          } else if (typeof q.answer === 'string') {
            answersList = q.answer.split(/[,;\/]+/).map(a => a.trim());
          } else if (typeof q.answer === 'object' && q.answer !== null) {
            answersList = Object.values(q.answer).map(a => String(a).trim());
          }

          script += `  // --- Soal No. ${qNum} (Kisi Benar/Salah) ---
  var gridItem${qNum} = form.addGridItem();
  gridItem${qNum}.setTitle(${JSON.stringify(`${qNum}. [Benar/Salah] ${qText}`)});
  gridItem${qNum}.setRows(${JSON.stringify(rows)});
  gridItem${qNum}.setColumns(["Benar", "Salah"]);
  gridItem${qNum}.setRequired(true);
  gridItem${qNum}.setHelpText("Pilih Benar atau Salah untuk setiap pernyataan di atas.");
`;
          if (answersList.length > 0) {
            const guideText = answersList.map((a, i) => `Baris ${i + 1} (${rows[i] || 'Pernyataan'}): ${a}`).join('\n');
            script += `  Logger.log("Kunci Jawaban Soal ${qNum} (Kisi Benar/Salah):\\n" + ${JSON.stringify(guideText)});\n`;
          }
          script += `\n`;
        } else {
          // Format Benar/Salah Pernyataan Tunggal Klasik
          const rawAns = typeof q.answer === 'string' ? q.answer.trim().toLowerCase() : '';
          const isBenar = rawAns === 'benar' || rawAns === 'b' || rawAns === 'true' || rawAns === '1' || rawAns === 'ya';
          const isSalah = rawAns === 'salah' || rawAns === 's' || rawAns === 'false' || rawAns === '0' || rawAns === 'tidak';

          script += `  var qItem${qNum} = form.addMultipleChoiceItem();
  qItem${qNum}.setTitle(${JSON.stringify(`${qNum}. [Benar/Salah] ${qText}`)});
  qItem${qNum}.setPoints(${points});
  qItem${qNum}.setRequired(true);
  qItem${qNum}.setChoices([
    qItem${qNum}.createChoice("Benar", ${isBenar ? 'true' : 'false'}),
    qItem${qNum}.createChoice("Salah", ${isSalah ? 'true' : 'false'})
  ]);\n\n`;
        }
        break;
      }

      case 'Pilihan Ganda Kompleks': {
        const options = (Array.isArray(q.options) ? q.options : []) as OptionItem[];
        script += `  var qItem${qNum} = form.addCheckboxItem();
  qItem${qNum}.setTitle(${JSON.stringify(`${qNum}. [Pilihan Ganda Kompleks - Pilih Semua yang Benar] ${qText}`)});
  qItem${qNum}.setPoints(${points});
  qItem${qNum}.setRequired(true);
  var choices${qNum} = [];
`;
        options.forEach((opt, optIdx) => {
          const optText = cleanHtmlText(opt.text || `Pilihan ${LETTERS[optIdx] || optIdx + 1}`);
          const letter = LETTERS[optIdx] || '';
          let isCorrect = false;
          if (Array.isArray(q.answer)) {
            isCorrect = q.answer.some(ans => ans.trim().toUpperCase() === letter || ans.trim() === optText.trim());
          } else if (typeof q.answer === 'string') {
            isCorrect = q.answer.trim().toUpperCase() === letter || q.answer.trim() === optText.trim();
          }

          script += `  choices${qNum}.push(qItem${qNum}.createChoice(${JSON.stringify(`${letter}. ${optText}`)}, ${isCorrect ? 'true' : 'false'}));\n`;
        });

        script += `  qItem${qNum}.setChoices(choices${qNum});\n\n`;
        break;
      }

      case 'Isian Singkat': {
        script += `  var qItem${qNum} = form.addTextItem();
  qItem${qNum}.setTitle(${JSON.stringify(`${qNum}. [Isian Singkat] ${qText}`)});
  qItem${qNum}.setPoints(${points});
  qItem${qNum}.setRequired(true);
  qItem${qNum}.setHelpText("Tuliskan jawaban singkat Anda.");\n`;
        if (q.answer) {
          const ansKey = Array.isArray(q.answer) ? q.answer.join(' / ') : String(q.answer);
          script += `  try {
    var fbIsian${qNum} = FormApp.createQuizFeedback().setText(${JSON.stringify(`Kunci Jawaban Guru: ${ansKey}`)}).build();
    qItem${qNum}.setGeneralFeedback(fbIsian${qNum});
  } catch (errFb) {}\n`;
        }
        script += `\n`;
        break;
      }

      case 'Esai': {
        script += `  var qItem${qNum} = form.addParagraphTextItem();
  qItem${qNum}.setTitle(${JSON.stringify(`${qNum}. [Esai / Uraian] ${qText}`)});
  qItem${qNum}.setPoints(${points});
  qItem${qNum}.setRequired(true);
  qItem${qNum}.setHelpText("Tuliskan uraian jawaban Anda secara lengkap dan jelas.");\n`;
        if (q.answer) {
          const ansKey = Array.isArray(q.answer) ? q.answer.join('\n') : String(q.answer);
          script += `  try {
    var fbEsai${qNum} = FormApp.createQuizFeedback().setText(${JSON.stringify(`Panduan Jawaban Guru:\n${ansKey}`)}).build();
    qItem${qNum}.setGeneralFeedback(fbEsai${qNum});
  } catch (errFb) {}\n`;
        }
        script += `\n`;
        break;
      }

      case 'Menjodohkan': {
        const pairs = (Array.isArray(q.options) ? q.options : []) as any[];
        let pairsText = '';
        if (pairs.length > 0) {
          pairsText = pairs.map((p, pIdx) => {
            const premise = p?.q?.text || p?.premise || `Pernyataan ${pIdx + 1}`;
            const response = p?.a?.text || p?.response || `Jawaban ${pIdx + 1}`;
            return `${pIdx + 1}) ${premise} <---> ${response}`;
          }).join('\n');
        }

        script += `  var qItem${qNum} = form.addParagraphTextItem();
  qItem${qNum}.setTitle(${JSON.stringify(`${qNum}. [Menjodohkan] ${qText}`)});
  qItem${qNum}.setPoints(${points});
  qItem${qNum}.setRequired(true);
  qItem${qNum}.setHelpText("Pasangkan premis dengan jawaban yang tepat di kolom jawaban.");\n`;
        if (pairsText) {
          script += `  try {
    var fbPair${qNum} = FormApp.createQuizFeedback().setText(${JSON.stringify(`Kunci Pasangan Guru:\n${pairsText}`)}).build();
    qItem${qNum}.setGeneralFeedback(fbPair${qNum});
  } catch (errFb) {}\n`;
        }
        script += `\n`;
        break;
      }

      default: {
        script += `  var qItem${qNum} = form.addParagraphTextItem();
  qItem${qNum}.setTitle(${JSON.stringify(`${qNum}. ${qText}`)});
  qItem${qNum}.setPoints(${points});
  qItem${qNum}.setRequired(true);\n\n`;
        break;
      }
    }
  });

  // Penutup skrip & output log link Google Form
  script += `  // Selesai
  Logger.log("=================================================");
  Logger.log("✅ GOOGLE FORM BERHASIL DIBUAT!");
  Logger.log("🔗 LINK EDIT GURU: " + form.getEditUrl());
  Logger.log("🔗 LINK UJIAN SISWA: " + form.getPublishedUrl());
  Logger.log("=================================================");
}
`;

  return script;
}

/**
 * Unduh file skrip Google Apps Script berekstensi .gs ke perangkat guru
 */
export function downloadGoogleAppsScriptFile(scriptContent: string, subjectTitle: string): void {
  const safeTitle = subjectTitle.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
  const fileName = `Buat_Google_Form_${safeTitle}.gs`;
  const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
