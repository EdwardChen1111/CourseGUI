import { CoursePlanner } from "@/components/course-planner";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a className="font-bold tracking-tight text-sky-800" href="#top">
            NTUST Course Planner
          </a>
          <div className="hidden gap-6 text-sm font-medium text-slate-600 sm:flex">
            <a href="#features">功能</a>
            <a href="#data">資料來源</a>
            <a href="#roadmap">開發進度</a>
          </div>
        </nav>
      </header>

      <section id="top" className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
        <div>
          <p className="mb-4 text-sm font-semibold tracking-[0.18em] text-sky-700">FOR NTUST STUDENTS</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            把選課與學業規劃，放在同一張地圖上。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            從課程搜尋、候選課表到畢業條件追蹤，幫助你更快看懂每一學期的選擇。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="rounded-lg bg-sky-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800" href="#planner">
              開始規劃課表
            </a>
            <a className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400" href="#data">
              了解資料來源
            </a>
          </div>
        </div>

        <aside className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold">候選課表</p>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">規劃中</span>
          </div>
          <div className="mt-6 space-y-3">
            <div className="rounded-lg border-l-4 border-sky-600 bg-sky-50 p-4">
              <p className="font-semibold">資料結構與演算法</p>
              <p className="mt-1 text-sm text-slate-600">課程時段標準化、衝堂偵測與本機候選清單。</p>
            </div>
            <div className="rounded-lg border-l-4 border-emerald-600 bg-emerald-50 p-4">
              <p className="font-semibold">課程資料同步</p>
              <p className="mt-1 text-sm text-slate-600">以校方課程資料建立可驗證、可回溯的學期快照。</p>
            </div>
          </div>
        </aside>
      </section>

      <div id="planner" className="border-y border-slate-200 bg-slate-100">
        <CoursePlanner />
      </div>

      <section id="features" className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold">MVP 功能</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              ["課程搜尋", "依課名、教師、學分、校區與時段篩選，並保留課綱與限制資訊。"],
              ["候選課表", "將開課班次放入同一張課表，即時顯示衝堂與總學分。"],
              ["修課進度", "依入學年度與系所規則，追蹤已完成與尚缺的課程。"],
            ].map(([title, description]) => (
              <article className="rounded-xl border border-slate-200 p-5" key={title}>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="data" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold">資料透明化</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          課程資料將以校方公開查詢系統為準。畢業規則會保留來源、適用入學年度、版本與最後驗證時間；平台結果僅供規劃參考，正式畢業資格以教務處審核為準。
        </p>
      </section>

      <footer id="roadmap" className="bg-slate-900 px-6 py-10 text-sm text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row">
          <p>NTUST Course Planner - early development</p>
          <p>資料更新與開發進度將公開記錄。</p>
        </div>
      </footer>
    </main>
  );
}
