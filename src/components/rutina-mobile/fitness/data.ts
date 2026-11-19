/* ============================================================
   PUSTAKA DATA BUGAR — dibawa dari Rutina v3 (rutina.html),
   diimplementasikan ulang mengikuti arsitektur Rutina 2.0.

   EX_LIB: 31 gerakan barbel (instruksi, otot, level, tips).
   PROG_DB: 4 program latihan (5×5, Atas–Bawah, PPL, Barbel Saja).
   ============================================================ */

export interface Exercise {
  name: string
  /** Nama tampilan bahasa Indonesia (utama); istilah Inggris
   *  menjadi keterangan kecil (v2.17). */
  idName: string
  /** Kelompok otot utama: Dada, Punggung, Kaki, Bahu, Lengan, Inti, Seluruh badan. */
  muscle: string
  /** Rincian otot yang bekerja. */
  detail: string
  /** 1 = Pemula, 2 = Menengah, 3 = Mahir. */
  level: 1 | 2 | 3
  equipment: string
  /** Pola gerak: Dorong, Tarik, Squat, Angkat. */
  pattern: string
  desc: string
  steps: string[]
  tip: string
  mistakes: string
}

export const EX_LIB: Exercise[] = [
  {
    name: 'Bench Press',
    idName: 'Dorong barbel terlentang',
    muscle: 'Dada',
    detail: 'Dada · Triceps · Bahu depan',
    level: 2,
    equipment: 'Barbel + Bangku',
    pattern: 'Dorong',
    desc: 'Gerakan dada utama: menekan barbel dari posisi terlentang di bangku datar.',
    steps: [
      'Berbaring, mata tepat di bawah barbel, kaki menapak kuat',
      'Cengkeraman sedikit lebih lebar bahu, turunkan barbel terkendali ke tengah dada',
      'Dorong ke atas sampai lengan lurus tanpa mengunci siku keras',
    ],
    tip: 'Turunkan pelan 2-3 detik; barbel menyentuh dada dengan lembut, bukan memantul.',
    mistakes: 'Siku membuka 90° dari badan → bahu tertekun; jaga sudut ±45° dari tubuh.',
  },
  {
    name: 'Incline Bench Press',
    idName: 'Dorong barbel bangku miring',
    muscle: 'Dada',
    detail: 'Dada atas · Bahu depan',
    level: 2,
    equipment: 'Barbel + Bangku',
    pattern: 'Dorong',
    desc: 'Menekan barbel di bangku miring 30-45° — fokus dada bagian atas.',
    steps: [
      'Atur bangku miring 30-45°, punggung & pinggul menempel',
      'Tarik bahu ke belakang, cengkeraman sedikit lebih lebar bahu',
      'Turunkan barbel ke tulang selangka, dorong ke atas mengikuti garis miring',
    ],
    tip: 'Jaga sudut siku konsisten dari atas ke bawah; jangan ubah lintasan mendadak di dasar.',
    mistakes: 'Beban terlalu berat membuat punggung melengkung dari bangku.',
  },
  {
    name: 'Close-Grip Bench Press',
    idName: 'Dorong barbel cengkeraman rapat',
    muscle: 'Dada',
    detail: 'Dada · Triceps',
    level: 2,
    equipment: 'Barbel + Bangku',
    pattern: 'Dorong',
    desc: 'Varian bench dengan cengkeraman selebar bahu — beban pindah ke triceps.',
    steps: [
      'Cengkeraman selebar bahu, pergelangan lurus di atas siku',
      'Turunkan barbel ke bawah dada/ulu hati',
      'Dorong ke atas, siku bergerak dekat badan',
    ],
    tip: 'Fokus siku menempel gerakan; rasakan triceps bekerja di puncak.',
    mistakes: 'Cengkeraman terlalu sempit melukai pergelangan — cukup selebar bahu.',
  },
  {
    name: 'Floor Press',
    idName: 'Dorong barbel sambil berbaring',
    muscle: 'Dada',
    detail: 'Dada · Triceps',
    level: 1,
    equipment: 'Barbel',
    pattern: 'Dorong',
    desc: 'Bench press versi lantar — sempurna untuk gym rumah tanpa bangku; jangkauan lebih pendek, siku berhenti di lantai.',
    steps: [
      'Terlentang di matras, lutut ditekuk, kaki menapak',
      'Cengkeraman sedikit lebih lebar bahu, barbel di atas dada',
      'Turunkan sampai lengan belakang menyentuh lantar, jeda 1 detik, dorong kembali',
    ],
    tip: 'Jeda di lantar membuang momentum — otot bekerja murni.',
    mistakes: 'Menjepit siku terlalu rapat membuat bahu tidak nyaman.',
  },
  {
    name: 'Push-Up',
    idName: 'Push-up',
    muscle: 'Dada',
    detail: 'Dada · Triceps · Inti',
    level: 1,
    equipment: 'Tanpa Alat',
    pattern: 'Dorong',
    desc: 'Gerakan dorong klasik tanpa alat — pemanasan dada atau latihan utama pemula.',
    steps: [
      'Tumpuan tangan sedikit lebih lebar bahu, badan lurus seperti papan',
      'Turunkan dada mendekati lantar, siku ±45° dari badan',
      'Dorong sampai lengan lurus tanpa mengangkat pinggul',
    ],
    tip: 'Jaga pinggul sejajar bahu sepanjang gerakan; inti tetap kencang.',
    mistakes: 'Pinggul turun atau naik — gerakan jadi setengahnya.',
  },
  {
    name: 'Barbell Row',
    idName: 'Tarik barbel ke arah perut',
    muscle: 'Punggung',
    detail: 'Punggung · Bisep',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Tarik',
    desc: 'Menarik barbel ke perut dari posisi membungkuk — pembangun punggung tebal utama.',
    steps: [
      'Berdiri, kaki selebar pinggul, bungkuk ±45°, punggung datar',
      'Tarik barbel ke pusar, siku melewati badan',
      'Turunkan terkendali tanpa mengubah sudut badan',
    ],
    tip: 'Dada tegak; tarik dengan siku dan himpit tulang belikat — bukan tangan.',
    mistakes: 'Mengangkat dengan lengan bengkok + punggung membulat — turunkan beban 20%.',
  },
  {
    name: 'Romanian Deadlift',
    idName: 'Turunkan dan angkat barbel',
    muscle: 'Punggung',
    detail: 'Punggung bawah · Hamstring',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Angkat',
    desc: 'Deadlift kaki hampir lurus: barbel turun ke tengah kering — peregangan hamstring sekaligus penguat punggung bawah.',
    steps: [
      'Berdiri tegak, barbel menempel paha',
      'Dorong pinggul ke belakang, barbel menyusuri paha turun ke tengah kering',
      'Pinggul maju kembali berdiri, punggung selalu datar',
    ],
    tip: 'Rasakan tarikan di belakang paha; lutut tetap sedikit menekuk.',
    mistakes: 'Barbel menjauh dari kaki — punggung membulat; jarak harus menempel paha.',
  },
  {
    name: 'Pendlay Row',
    idName: 'Tarik barbel dari lantai',
    muscle: 'Punggung',
    detail: 'Punggung · Bisep',
    level: 3,
    equipment: 'Barbel',
    pattern: 'Tarik',
    desc: 'Row eksplosif: barbel menyentuh lantar tiap repetisi — kekuatan punggung murni.',
    steps: [
      'Posisi bungkuk punggung datar, barbel di lantar',
      'Tarik barbel ke dada bawah satu gerakan cepat',
      'Turunkan ke lantar, ulangi dari nol',
    ],
    tip: 'Badan tetap sejajar tanpa naik-turun; setiap repetisi dimulai dari diam.',
    mistakes: 'Mengayun badan untuk membantu tarikan — kurangi beban.',
  },
  {
    name: 'Rack Pull',
    idName: 'Angkat barbel dari rak',
    muscle: 'Punggung',
    detail: 'Punggung atas · Trapezius',
    level: 2,
    equipment: 'Barbel + Rak',
    pattern: 'Angkat',
    desc: 'Deadlift dengan titik awal di rak setinggi atas lutut — beban sangat berat untuk punggung atas & genggaman.',
    steps: [
      'Atur penyangga rak setinggi atas lutut',
      'Berdiri tegap, tarik barbel ke atas pinggul, dada maju',
      'Tahan 1 detik berdiri penuh, turunkan ke penyangga',
    ],
    tip: 'Genggaman campur (satu telapak balik) bila genggaman ganda kalah berat.',
    mistakes: 'Berubah jadi shrug — tarik dengan seluruh badan, bukan bahu saja.',
  },
  {
    name: 'Pull-Up',
    idName: 'Angkat badan di bar',
    muscle: 'Punggung',
    detail: 'Punggung lebar · Bisep',
    level: 3,
    equipment: 'Bar Gantung',
    pattern: 'Tarik',
    desc: 'Menarik badan naik di bar gantung — raja punggung lebar; bar pintu cukup di rumah.',
    steps: [
      'Gantung, cengkeraman sedikit lebih lebar bahu',
      'Tarik badan sampai dagu melewati bar, dada mendekat ke bar',
      'Turunkan terkendali sampai lengan lurus',
    ],
    tip: 'Picit bar dengan tangan; bayangkan siku turun ke saku belakang.',
    mistakes: 'Mengayun kaki membuat setengah gerakan — badan kaku seperti papan.',
  },
  {
    name: 'Barbell Shrug',
    idName: 'Angkat bahu dengan barbel',
    muscle: 'Punggung',
    detail: 'Trapezius',
    level: 1,
    equipment: 'Barbel',
    pattern: 'Tarik',
    desc: 'Mengangkat bahu lurus ke atas dengan barbel di tangan — trapezius tebal.',
    steps: [
      'Berdiri tegak, barbel menggantung di depan paha',
      'Angkat bahu lurus ke telinga tanpa menekuk siku',
      'Tahan 1 detik di atas, turunkan perlahan',
    ],
    tip: 'Gerakan hanya di bahu; kepala tetap netral, pandangan ke depan.',
    mistakes: 'Memutar bahu melingkar — risiko cedera; gerak lurus saja.',
  },
  {
    name: 'Back Squat',
    idName: 'Jongkok barbel di belakang leher',
    muscle: 'Kaki',
    detail: 'Kaki · Glute · Inti',
    level: 2,
    equipment: 'Barbel + Rak',
    pattern: 'Squat',
    desc: 'Raja latihan kaki: barbel di belakang leher, badan turun sampai pinggul sejajar lutut.',
    steps: [
      'Barbel istirahat di trapezius, kaki selebar bahu, jari kaki sedikit keluar',
      'Turunkan pinggul ke belakang-bawah sampai paha sejajar lantai atau lebih dalam',
      'Dorong tumit, berdiri kembali dengan dada tegak',
    ],
    tip: 'Lutut mengikuti arah jari kaki; berat tertumpu di tengah telapak.',
    mistakes: 'Lutut jatuh ke dalam atau tumit terangkat — turunkan beban, perbaiki posisi.',
  },
  {
    name: 'Front Squat',
    idName: 'Jongkok barbel di depan bahu',
    muscle: 'Kaki',
    detail: 'Kaki depan · Inti',
    level: 3,
    equipment: 'Barbel + Rak',
    pattern: 'Squat',
    desc: 'Squat dengan barbel di depan bahu — punggung lebih tegak, tekanan ke otot depan paha.',
    steps: [
      'Barbel istirahat di depan bahu, siku tinggi menghadap atas',
      'Turunkan mantap, dada & siku tetap tinggi',
      'Berdiri dengan mendorong lantar',
    ],
    tip: 'Siku selalu menghadap atas; barbel menempel leher bagian depan.',
    mistakes: 'Siku turun → barbel menggelinding ke depan; latih kelenturan pergelangan dulu.',
  },
  {
    name: 'Zercher Squat',
    idName: 'Jongkok sambil memegang barbel',
    muscle: 'Kaki',
    detail: 'Kaki · Inti · Punggung atas',
    level: 3,
    equipment: 'Barbel',
    pattern: 'Squat',
    desc: 'Squat memeluk barbel di lipatan siku — tanpa rak; inti & punggung bekerja ekstra.',
    steps: [
      'Barbel dipeluk di lipatan siku, rapat ke badan',
      'Turunkan pinggul sambil menjaga dada tegak',
      'Berdiri dengan mendorong tumit',
    ],
    tip: 'Siku rapat badan; mulai dari barbel kosong untuk membiasakan posisi.',
    mistakes: 'Beban terlalu jauh dari badan — punggung bawah langsung protes.',
  },
  {
    name: 'Bulgarian Split Squat',
    idName: 'Jongkok satu kaki di kursi',
    muscle: 'Kaki',
    detail: 'Glute · Kaki',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Squat',
    desc: 'Squat satu kaki, kaki belakang bertumpu di kursi/sofa — pembakar glute tanpa beban besar.',
    steps: [
      'Satu kaki belakang di atas kursi, barbel di tangan atau belakang leher',
      'Turunkan sampai paha depan sejajar lantar',
      'Dorong tumit depan, berdiri kembali',
    ],
    tip: 'Badan condong sedikit ke depan untuk glute; tegak untuk paha depan.',
    mistakes: 'Langkah terlalu pendek — lutut depan melampaui jari kaki.',
  },
  {
    name: 'Barbell Lunge',
    idName: 'Melangkah maju dengan barbel',
    muscle: 'Kaki',
    detail: 'Glute · Kaki',
    level: 1,
    equipment: 'Barbel',
    pattern: 'Squat',
    desc: 'Melangkah maju-menurun dengan barbel — kaki bergantian, keseimbangan ikut terlatih.',
    steps: [
      'Barbel di belakang leher atau digantung di tangan',
      'Melangkah maju satu kaki, turunkan lutut belakang mendekati lantar',
      'Dorong kaki depan kembali berdiri',
    ],
    tip: 'Langkah cukup panjang agar lutut depan aman; badan tegak.',
    mistakes: 'Membungkuk ke depan — beban menjauh dari garis tubuh.',
  },
  {
    name: 'Hip Thrust',
    idName: 'Dorong pinggul ke atas',
    muscle: 'Kaki',
    detail: 'Glute · Hamstring',
    level: 1,
    equipment: 'Barbel + Bangku',
    pattern: 'Angkat',
    desc: 'Mendorong pinggul ke atas dengan punggung bersandar bangku — glute terisolasi maksimal.',
    steps: [
      'Punggung atas di tepi bangku, barbel di lipatan paha (handuk sebagai bantalan)',
      'Dorong tumit, angkat pinggul sampai badan membentuk garis datar',
      'Tahan 1 detik di puncak, turunkan perlahan',
    ],
    tip: 'Dagu ke dada, mata ke depan-bawah; picit glute di puncak.',
    mistakes: 'Pinggul melengkung berlebihan — berhenti tepat di garis datar.',
  },
  {
    name: 'Barbell Calf Raise',
    idName: 'Angkat tumit dengan barbel',
    muscle: 'Kaki',
    detail: 'Betis',
    level: 1,
    equipment: 'Barbel',
    pattern: 'Dorong',
    desc: 'Berdiri mengangkat tumit dengan barbel di tangan — betis terlatih langsung.',
    steps: [
      'Berdiri dengan tumit menggantung di tepi tangga/buku tebal',
      'Angkat tumit setinggi mungkin',
      'Turunkan perlahan sampai betis tererejang penuh',
    ],
    tip: 'Jeda 1 detik di puncak; jangkauan penuh turun-naik.',
    mistakes: 'Memantul cepat — membuang setengah repetisi; perlambat.',
  },
  {
    name: 'Overhead Press',
    idName: 'Dorong barbel ke atas',
    muscle: 'Bahu',
    detail: 'Bahu · Triceps · Inti',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Dorong',
    desc: 'Menekan barbel dari bahu ke atas kepala sambil berdiri — bahu & stabilitas seluruh badan.',
    steps: [
      'Barbel di depan bahu, cengkeraman sedikit lebih lebar bahu',
      'Kencangkan inti & glute, dorong barbel ke atas sampai telinga sejajar lengan',
      'Turunkan kembali ke bahu terkendali',
    ],
    tip: 'Kepala mundur sedikit agar barbel lewat dagu, lalu maju kembali; badan kaku.',
    mistakes: 'Punggung melengkung → tekanan lumbar; kurangi beban, kencangkan inti.',
  },
  {
    name: 'Push Press',
    idName: 'Dorong barbel dibantu kaki',
    muscle: 'Bahu',
    detail: 'Bahu · Kaki',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Dorong',
    desc: 'Overhead press dibantu hentakan kecil lutut — beban lebih berat dari OHP murni.',
    steps: [
      'Barbel di depan bahu',
      'Tekuk lutut sedikit, ledakkan kaki ke lantar serentak dengan tekanan lengan',
      'Kunci lengan di atas, badan kembali lurus',
    ],
    tip: 'Waktunya harus serentak: kaki meledak, lengan melanjutkan.',
    mistakes: 'Hentakan terlalu besar → barbel lepas dari garis; kuncinya halus.',
  },
  {
    name: 'Seated Overhead Press',
    idName: 'Dorong barbel ke atas sambil duduk',
    muscle: 'Bahu',
    detail: 'Bahu · Triceps',
    level: 1,
    equipment: 'Barbel + Bangku',
    pattern: 'Dorong',
    desc: 'OHP sambil duduk bersandar — kaki tak ikut menolong, bahu bekerja penuh.',
    steps: [
      'Duduk bersandar 85-90°, barbel di depan bahu',
      'Dorong ke atas sampai lengan lurus',
      'Turunkan terkendali ke bahu',
    ],
    tip: 'Tanpa bersandar penuh bila inti ingin ikut terlatih.',
    mistakes: 'Dada terlalu terbuka saat bersandar — barbel jatuh ke belakang.',
  },
  {
    name: 'Barbell Curl',
    idName: 'Angkat barbel ke arah dada',
    muscle: 'Lengan',
    detail: 'Bisep',
    level: 1,
    equipment: 'Barbel',
    pattern: 'Tarik',
    desc: 'Melipat siku mengangkat barbel — gerakan bisep paling murni.',
    steps: [
      'Berdiri, cengkeraman selebar bahu, telapak menghadap atas',
      'Lipat siku angkat barbel ke bahu tanpa menggeser siku',
      'Turunkan penuh sampai lengan lurus',
    ],
    tip: 'Siku menempel rusuk; 2 detik turun lebih berharga dari angkatan cepat.',
    mistakes: 'Mengayun punggung untuk memompa — beban turun 20%.',
  },
  {
    name: 'Reverse Curl',
    idName: 'Angkat barbel telapak bawah',
    muscle: 'Lengan',
    detail: 'Lengan bawah · Bisep',
    level: 1,
    equipment: 'Barbel',
    pattern: 'Tarik',
    desc: 'Curl dengan telapak menghadap bawah — lengan bawah & genggaman ikut menguat.',
    steps: [
      'Cengkeraman telapak bawah, selebar bahu',
      'Angkat barbel dengan siku tetap di tempat',
      'Turunkan perlahan',
    ],
    tip: 'Genggaman sekuat mungkin; beban lebih ringan dari curl biasa.',
    mistakes: 'Beban menyamai curl biasa — bentuk pasti rusak.',
  },
  {
    name: 'Skull Crusher',
    idName: 'Lipat barbel ke dahi',
    muscle: 'Lengan',
    detail: 'Triceps',
    level: 2,
    equipment: 'Barbel + Bangku',
    pattern: 'Dorong',
    desc: 'Extensi triceps terlentang: barbel turun ke dahi — triceps panjang terlatih.',
    steps: [
      'Terlentang di bangku, lengan lurus ke atas, cengkeraman rapat',
      'Tekuk siku, turunkan barbel ke arah dahi',
      'Luruskan kembali tanpa menggeser lengan atas',
    ],
    tip: 'Hanya siku yang bergerak; lengan atas vertikal seperti patung.',
    mistakes: 'Siku melebar ke samping — gerakan jadi bench press sebagian.',
  },
  {
    name: 'Barbell Side Bend',
    idName: 'Miringkan badan dengan barbel',
    muscle: 'Inti',
    detail: 'Perut samping',
    level: 1,
    equipment: 'Barbel',
    pattern: 'Tarik',
    desc: 'Memiringkan badan sambil memegang barbel satu tangan — otot perut samping terisolasi.',
    steps: [
      'Berdiri, barbel di tangan kanan, tangan kiri di pinggang',
      'Miringkan badan ke kiri terkendali',
      'Kembali tegak; ganti sisi setelah set selesai',
    ],
    tip: 'Pinggul tetap diam; gerakan hanya dari batang badan.',
    mistakes: 'Memegang barbel dua tangan bersamaan — saling meniadakan, gerakan jadi nol.',
  },
  {
    name: 'Barbell Ab Rollout',
    idName: 'Gulung barbel maju-mundur',
    muscle: 'Inti',
    detail: 'Perut lurus',
    level: 3,
    equipment: 'Barbel',
    pattern: 'Dorong',
    desc: 'Menggulung barbel keluar-masuk sambil berlutut — perut bekerja seperti papan dinamis.',
    steps: [
      'Berlutut, kedua tangan memegang barbel yang menggelinding di lantar',
      'Gulung barbel ke depan sampai badan hampir datar',
      'Tarik kembali ke posisi berlutut tegak',
    ],
    tip: 'Punggung tidak boleh turun (anti-lengkung); buang napas saat menggulung.',
    mistakes: 'Menjangkau terlalu jauh sejak awal — mulai dari jarak pendek.',
  },
  {
    name: 'Deadlift',
    idName: 'Angkat barbel dari lantai',
    muscle: 'Seluruh badan',
    detail: 'Glute · Punggung · Inti',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Angkat',
    desc: 'Mengangkat barbel dari lantar — gerakan paling jujur: seluruh badan bekerja serentak.',
    steps: [
      'Barbel di atas tengah kaki, cengkeraman sedikit lebih lebar dari kaki',
      'Dada tegak, punggung datar, dorong kaki ke lantar sementara pinggul maju',
      'Berdiri penuh, kunci pinggul tanpa mengangkat bahu',
    ],
    tip: 'Barbel menyusuri kaki sepanjang jalan; dorong lantar — jangan menarik barbel.',
    mistakes: 'Pinggul terbang duluan → punggung membulat; turunkan beban 15%.',
  },
  {
    name: 'Sumo Deadlift',
    idName: 'Angkat barbel kaki lebar',
    muscle: 'Seluruh badan',
    detail: 'Glute · Paha dalam',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Angkat',
    desc: 'Deadlift kaki lebar, cengkeraman di dalam lutut — lintasan lebih pendek, paha dalam terlibat.',
    steps: [
      'Kaki lebar ±1,5× bahu, jari kaki keluar 30-45°',
      'Cengkeraman rapat di dalam lutut',
      'Dorong lantar ke arah luar, pinggul lurus ke depan',
    ],
    tip: 'Lutut mengikuti arah jari kaki; dada unggul dari pinggul.',
    mistakes: 'Berubah jadi squat — pinggul turun terlalu dalam.',
  },
  {
    name: 'Power Clean',
    idName: 'Angkat barbel eksplosif ke bahu',
    muscle: 'Seluruh badan',
    detail: 'Kaki · Punggung · Bahu',
    level: 3,
    equipment: 'Barbel',
    pattern: 'Angkat',
    desc: 'Mengangkat barbel dari lantar ke bahu dengan ledakan pinggul — kekuatan eksplosif klasik.',
    steps: [
      'Posisi deadlift, punggung datar',
      'Ledakkan pinggul, barbel meluncur di depan paha',
      'Putar siku ke bawah, terima barbel di bahu',
    ],
    tip: 'Lengan hanya tali — tenaga dari pinggul; latih pola dengan barbel kosong dulu.',
    mistakes: 'Menarik dengan lengan sejak bawah — momen eksplosif hilang.',
  },
  {
    name: 'Thruster',
    idName: 'Jongkok-dorong satu gerakan',
    muscle: 'Seluruh badan',
    detail: 'Kaki · Bahu · Inti',
    level: 2,
    equipment: 'Barbel',
    pattern: 'Dorong',
    desc: 'Front squat + overhead press jadi satu gerakan mengalir — pembakar & pembangun tenaga total.',
    steps: [
      'Barbel di depan bahu, turunkan ke squat',
      'Berdiri eksplosif, lanjutkan tenaga mendorong barbel ke atas',
      'Turunkan kembali ke bahu, langsung squat berikutnya',
    ],
    tip: 'Satu gerakan mengalir: kaki memberi makan lengan; jangan berhenti di tengah.',
    mistakes: 'Memisah jadi dua gerakan terpisah — ritme hilang, tenaga terbuang.',
  },
  {
    name: 'Clean & Press',
    idName: 'Angkat lalu dorong barbel',
    muscle: 'Seluruh badan',
    detail: 'Seluruh badan',
    level: 3,
    equipment: 'Barbel',
    pattern: 'Angkat',
    desc: 'Power clean dilanjut overhead press — gerakan angkat berat klasik pra-Olimpiade.',
    steps: [
      'Angkat barbel ke bahu (clean)',
      'Stabilkan sejenak, dorong ke atas kepala',
      'Turunkan ke bahu, lalu ke lantar',
    ],
    tip: 'Ritme panjang napas; jeda wajar di bahu tiap repetisi.',
    mistakes: 'Menggabung terlalu cepat tanpa stabilisasi — bentuk rusak di tekanan.',
  },
]


/** Nama tampilan Indonesia untuk sebuah gerakan — jatuh ke nama Inggris
 *  bila gerakan tak terdaftar (aman untuk data lama). */
export function exerciseLabel(name: string): string {
  return EX_LIB.find((e) => e.name === name)?.idName ?? name
}

/** Enam gerakan inti barbel rumah (v2.17) — alat cukup barbel 5 kg +
 *  matras; gerakan paling relevan untuk gym rumah sederhana. */
export const HOME_BARBELL_CORE: string[] = [
  'Barbell Curl',
  'Overhead Press',
  'Barbell Row',
  'Romanian Deadlift',
  'Floor Press',
  'Zercher Squat',
]

export const EX_LEVELS: Record<1 | 2 | 3, string> = {
  1: 'Pemula',
  2: 'Menengah',
  3: 'Mahir',
}

/** Urutan kelompok otot untuk filter pustaka. */
export const MUSCLE_GROUPS = [
  'Dada',
  'Punggung',
  'Kaki',
  'Bahu',
  'Lengan',
  'Inti',
  'Seluruh badan',
]

/* ===== Program latihan ===== */

export interface ProgramDay {
  label: string
  /** Rekomendasi istirahat antar set. */
  rest: string
  ex: { name: string; sets: number; reps: number }[]
}

export interface Program {
  id: string
  name: string
  level: string
  freq: string
  /** Durasi sesi dalam menit. */
  dur: number
  focus: string
  desc: string
  prog: string
  days: ProgramDay[]
}

/** Alat cukup barbel + rak + bangku — semua gerakan tersedia di EX_LIB. */
export const PROG_DB: Program[] = [
  {
    id: 'sl5x5',
    name: 'Barbel 5×5',
    level: 'Pemula → Menengah',
    freq: '3×/pekan',
    dur: 45,
    focus: 'Kekuatan dasar',
    desc: 'Klasik kekuatan rumahan: tiga gerakan besar per sesi, bergantian Hari A/B (cth: Sen·Rab·Jum). Mulai ringat, naik pelan — bentuk dulu, beban kemudian.',
    prog: 'Naik 2,5 kg tiap sesi selama semua repetisi tercapai (deadlift boleh 5 kg); terjebak 3 sesi → turun 10% & bangun ulang.',
    days: [
      {
        label: 'Hari A',
        rest: '2–3 mnt',
        ex: [
          { name: 'Back Squat', sets: 5, reps: 5 },
          { name: 'Bench Press', sets: 5, reps: 5 },
          { name: 'Barbell Row', sets: 5, reps: 5 },
        ],
      },
      {
        label: 'Hari B',
        rest: '2–3 mnt',
        ex: [
          { name: 'Back Squat', sets: 5, reps: 5 },
          { name: 'Overhead Press', sets: 5, reps: 5 },
          { name: 'Deadlift', sets: 1, reps: 5 },
        ],
      },
    ],
  },
  {
    id: 'ul',
    name: 'Atas–Bawah',
    level: 'Pemula → Menengah',
    freq: '4×/pekan',
    dur: 50,
    focus: 'Otot merata',
    desc: 'Belah pekan: dua hari badan atas, dua hari badan bawah (cth: Sen·Sel·Kam·Jum). Volume lebih banyak per otot — jembatan dari 5×5 ke program lanjutan.',
    prog: 'Naik 2,5 kg saat semua set tercapai dua sesi berturut; gerakan kecil (curl, calf) naik 1,25–2,5 kg.',
    days: [
      {
        label: 'Hari Atas',
        rest: '90 dtk',
        ex: [
          { name: 'Bench Press', sets: 4, reps: 6 },
          { name: 'Barbell Row', sets: 4, reps: 6 },
          { name: 'Seated Overhead Press', sets: 3, reps: 8 },
          { name: 'Barbell Curl', sets: 3, reps: 10 },
          { name: 'Skull Crusher', sets: 3, reps: 10 },
        ],
      },
      {
        label: 'Hari Bawah',
        rest: '90 dtk',
        ex: [
          { name: 'Back Squat', sets: 4, reps: 6 },
          { name: 'Romanian Deadlift', sets: 3, reps: 8 },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 10 },
          { name: 'Barbell Calf Raise', sets: 4, reps: 12 },
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Dorong–Tarik–Kaki',
    level: 'Menengah → Mahir',
    freq: '6×/pekan',
    dur: 60,
    focus: 'Volume & otot',
    desc: 'Rotasi tiga hari: Dorong (dada-bahu-triceps), Tarik (punggung-bisep), Kaki — masing-masing 2× seminggu. Volume terbesar; butuh pemulihan rapi.',
    prog: 'Gerakan besar naik 2,5 kg saat semua set tercapa; gerakan bantu ikut naik begitu repetisi puncak tercapai semua set.',
    days: [
      {
        label: 'Dorong',
        rest: '90 dtk',
        ex: [
          { name: 'Bench Press', sets: 4, reps: 6 },
          { name: 'Overhead Press', sets: 4, reps: 8 },
          { name: 'Incline Bench Press', sets: 3, reps: 10 },
          { name: 'Skull Crusher', sets: 3, reps: 10 },
        ],
      },
      {
        label: 'Tarik',
        rest: '90 dtk',
        ex: [
          { name: 'Deadlift', sets: 4, reps: 5 },
          { name: 'Barbell Row', sets: 4, reps: 8 },
          { name: 'Pull-Up', sets: 4, reps: 8 },
          { name: 'Barbell Curl', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Kaki',
        rest: '2 mnt',
        ex: [
          { name: 'Back Squat', sets: 5, reps: 5 },
          { name: 'Front Squat', sets: 3, reps: 8 },
          { name: 'Romanian Deadlift', sets: 3, reps: 8 },
          { name: 'Barbell Calf Raise', sets: 4, reps: 12 },
        ],
      },
    ],
  },
  {
    id: 'min',
    name: 'Barbel Saja',
    level: 'Pemula',
    freq: '3×/pekan',
    dur: 40,
    focus: 'Sarana minimal',
    desc: 'Tanpa bangku & tanpa rak — cukup barbel + matras. Semua gerakan aman dimulai dari lantar; pilihan jujur untuk gym rumah paling sederhana.',
    prog: 'Naik 2,5 kg saat semua set tercapa; Zercher & deadlift naik pelan 2,5 kg tanpa terkecuali.',
    days: [
      {
        label: 'Hari A',
        rest: '90 dtk',
        ex: [
          { name: 'Zercher Squat', sets: 4, reps: 8 },
          { name: 'Floor Press', sets: 4, reps: 8 },
          { name: 'Barbell Row', sets: 4, reps: 8 },
          { name: 'Barbell Curl', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Hari B',
        rest: '90 dtk',
        ex: [
          { name: 'Deadlift', sets: 3, reps: 5 },
          { name: 'Overhead Press', sets: 4, reps: 8 },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 10 },
          { name: 'Barbell Side Bend', sets: 3, reps: 12 },
        ],
      },
    ],
  },
]
