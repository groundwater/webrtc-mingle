import React from 'react'

export function Login(_start: (s: string) => void) {
    let name_ref = React.createRef<HTMLInputElement>()
    return <div className="container">
        <form className="form" onSubmit={async submit => {
            submit.preventDefault()
            let name = name_ref.current!.value
            await fetch('/login', {
                method: 'POST',
                body: JSON.stringify({ name }),
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            _start(name)
        }}>
            <h1>Login</h1>
            <div className="form-group">
                <label>Display name</label>
                <input ref={name_ref} type="text" className="form-control" />
            </div>
            <button type="submit" className="btn btn-primary">Join Video</button>
        </form>
    </div>
}
