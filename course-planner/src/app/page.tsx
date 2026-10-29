import { CourseQuery } from "@/components/course-query";

export default function Home() {
  return <main id="top" className="app-shell">
    <h1 className="sr-only">臺科課程查詢與課表規劃</h1>
    <header className="app-header"><a className="brand" href="#top"><span className="brand-icon" aria-hidden="true">▦</span><span>臺科課程規劃<small>NTUST COURSE PLANNER</small></span></a><a className="official-link" href="https://querycourse.ntust.edu.tw/QueryCourse/#/" target="_blank" rel="noreferrer">校方課程查詢 ↗</a></header>
    <CourseQuery />
    <footer className="app-footer"><span>你的課表，保存在你的裝置。</span><a href="https://github.com/EdwardChen1111/CourseGUI" target="_blank" rel="noreferrer">專案與問題回報 ↗</a></footer>
  </main>;
}
