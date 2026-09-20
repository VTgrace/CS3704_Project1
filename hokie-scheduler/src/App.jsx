import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header>
        <h1>Hokie Scheduler</h1>
        <p className="disclaimer">
          Student project — not affiliated with Virginia Tech. Planning aid only;
          verify all details in the official timetable before enrolling.
        </p>
      </header>

      <div className="layout">
        <section className="panel" aria-label="Course search">
          <h2>Search courses</h2>
          <input
            type="search"
            placeholder="e.g. CS 2114, data structures, Brown"
            aria-label="Search courses"
          />
          <ul className="results">
            result1 <br/>
            result2 <br/>
            result3
          </ul>
        </section>

        <section className="panel" aria-label="Weekly calendar">
          <h2>
            Weekly schedule
          </h2>

          <div className="calendar">
            <div className="cal-head">
              <div className="cal-gutter" />

            </div>
            <div className="cal-body">
              <div className="cal-gutter hours">
                
              </div>

            </div>
          </div>

          <ul className="schedule-list">
            class1 <br/>
            class2 <br/>
            class3
          </ul>
        </section>
      </div>
    </div>
  );
}

export default App
