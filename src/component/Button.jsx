import React from 'react'
import './Button.css'
export default function Button({btnType="button",key=0, btnClass='', btnText = 'button', click}) {
  return (
    <button type={btnType} key={key} className={`btn ${btnClass}`} onClick={click} >
        {btnText}
    </button>
  )
}
