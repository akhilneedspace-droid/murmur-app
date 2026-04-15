import { createContext, useContext, useState } from 'react'

const QuizContext = createContext(null)

export function QuizProvider({ children }) {
  const [answers, setAnswers] = useState([])
  const [identity, setIdentity] = useState(null) // 'carrier' | 'anchor' | 'wanderer'

  function recordAnswer(questionIndex, answerIndex) {
    setAnswers(prev => {
      const next = [...prev]
      next[questionIndex] = answerIndex
      return next
    })
  }

  function computeIdentity(finalAnswers) {
    // Scoring: 0 = expresser leaning, 1 = listener leaning, 2 = neutral
    const map = [
      [0, 2, 0, 2],   // Q1: hold in, talk, write, don't know
      [1, 2, 0],       // Q2: listen, fix, freeze
      [0, 0, 1],       // Q3: yes stranger, anonymous ok, need trust
      [0, 1, 2],       // Q4: express, listen, curious
      [0, 2, 1, 2],    // Q5: heavy, okay, good-helping, in between
    ]
    let expresser = 0, listener = 0
    finalAnswers.forEach((a, i) => {
      const score = map[i]?.[a] ?? 2
      if (score === 0) expresser++
      else if (score === 1) listener++
    })
    let result
    if (expresser > listener) result = 'carrier'
    else if (listener > expresser) result = 'anchor'
    else result = 'wanderer'
    setIdentity(result)
    return result
  }

  return (
    <QuizContext.Provider value={{ answers, identity, recordAnswer, computeIdentity }}>
      {children}
    </QuizContext.Provider>
  )
}

export function useQuiz() {
  return useContext(QuizContext)
}