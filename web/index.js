(() => {
    const $execute = document.querySelector('#execute')
    const $url = document.querySelector('#url')
    const $errorMessage = document.querySelector('#error-message')
    $execute.onclick = event => {
        switch ($execute.innerHTML) {
            case 'Shorten': 
                event.preventDefault()
                const xhr = new XMLHttpRequest();
                xhr.onload = () => {
                    try {
                        const response = JSON.parse(xhr.responseText)
                        if (xhr.status == 200) {
                            $url.value = `https://urls.durfee.io/${response.id}`
                            $execute.innerHTML = 'Copy'
                            $errorMessage.hidden = true
                        } else {
                            $errorMessage.innerHTML = `Unable to shorten URL.`
                            console.error(`${response.error.message}`)
                            $errorMessage.hidden = false
                        }
                    } catch (error) {
                        $errorMessage.innerHTML = `Unable to shorten URL.`
                        console.error(`Failed to parse response: ${xhr.responseText}`)
                        $errorMessage.hidden = false
                        return
                    }
                }
                xhr.onerror = () => {
                    $errorMessage.innerHTML = `Unable to shorten URL`
                    console.error(`Failed to send request`)
                    $errorMessage.hidden = false
                }
                xhr.open('POST', 'https://api.urls.durfee.io/urls')
                xhr.setRequestHeader('Content-Type', 'application/json')
                xhr.send(JSON.stringify({
                    'url': $url.value
                }))
                break
            case 'Copy':
                event.preventDefault()
                $url.select();
                document.execCommand('copy')
                break
        }
    }
    $url.onkeypress = event => {
        if (event.which == 13) {
            event.preventDefault()
            $execute.click()
        }
    }
})()

