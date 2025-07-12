import React, { useState } from 'react'
import UploadProgress from './UploadProgress'

const UploadProgressDemo = () => {
  const [showDemo, setShowDemo] = useState(false)
  const [demoStep, setDemoStep] = useState('preparing')
  const [demoProgress, setDemoProgress] = useState({
    overall: 0,
    completed: 0,
    files: [
      { status: 'pending', progress: 0 },
      { status: 'pending', progress: 0 },
      { status: 'pending', progress: 0 }
    ],
    currentFile: null
  })

  const demoFiles = [
    { name: 'station-image-1.jpg', size: 2500000, type: 'image/jpeg' },
    { name: 'station-image-2.jpg', size: 1800000, type: 'image/jpeg' },
    { name: 'master-photo.jpg', size: 1200000, type: 'image/jpeg' }
  ]

  const startDemo = () => {
    setShowDemo(true)
    setDemoStep('preparing')
    setDemoProgress({
      overall: 0,
      completed: 0,
      files: [
        { status: 'pending', progress: 0 },
        { status: 'pending', progress: 0 },
        { status: 'pending', progress: 0 }
      ],
      currentFile: null
    })

    // Simulate upload progress
    setTimeout(() => {
      setDemoStep('generating')
    }, 1000)

    setTimeout(() => {
      setDemoStep('uploading')
      setDemoProgress(prev => ({
        ...prev,
        currentFile: { name: demoFiles[0].name, progress: 0 },
        files: [
          { status: 'uploading', progress: 0 },
          { status: 'pending', progress: 0 },
          { status: 'pending', progress: 0 }
        ]
      }))
    }, 2000)

    // Simulate first file upload
    let progress1 = 0
    const interval1 = setInterval(() => {
      progress1 += Math.random() * 15
      if (progress1 >= 100) {
        progress1 = 100
        clearInterval(interval1)
        setDemoProgress(prev => ({
          ...prev,
          overall: 33,
          completed: 1,
          currentFile: { name: demoFiles[1].name, progress: 0 },
          files: [
            { status: 'completed', progress: 100 },
            { status: 'uploading', progress: 0 },
            { status: 'pending', progress: 0 }
          ]
        }))

        // Simulate second file upload
        let progress2 = 0
        const interval2 = setInterval(() => {
          progress2 += Math.random() * 20
          if (progress2 >= 100) {
            progress2 = 100
            clearInterval(interval2)
            setDemoProgress(prev => ({
              ...prev,
              overall: 66,
              completed: 2,
              currentFile: { name: demoFiles[2].name, progress: 0 },
              files: [
                { status: 'completed', progress: 100 },
                { status: 'completed', progress: 100 },
                { status: 'uploading', progress: 0 }
              ]
            }))

            // Simulate third file upload
            let progress3 = 0
            const interval3 = setInterval(() => {
              progress3 += Math.random() * 25
              if (progress3 >= 100) {
                progress3 = 100
                clearInterval(interval3)
                setDemoProgress(prev => ({
                  ...prev,
                  overall: 100,
                  completed: 3,
                  files: [
                    { status: 'completed', progress: 100 },
                    { status: 'completed', progress: 100 },
                    { status: 'completed', progress: 100 }
                  ]
                }))

                setTimeout(() => {
                  setDemoStep('confirming')
                }, 500)

                setTimeout(() => {
                  setDemoStep('completed')
                }, 1500)
              } else {
                setDemoProgress(prev => ({
                  ...prev,
                  currentFile: { name: demoFiles[2].name, progress: progress3 },
                  files: [
                    { status: 'completed', progress: 100 },
                    { status: 'completed', progress: 100 },
                    { status: 'uploading', progress: progress3 }
                  ]
                }))
              }
            }, 100)
          } else {
            setDemoProgress(prev => ({
              ...prev,
              currentFile: { name: demoFiles[1].name, progress: progress2 },
              files: [
                { status: 'completed', progress: 100 },
                { status: 'uploading', progress: progress2 },
                { status: 'pending', progress: 0 }
              ]
            }))
          }
        }, 100)
      } else {
        setDemoProgress(prev => ({
          ...prev,
          currentFile: { name: demoFiles[0].name, progress: progress1 },
          files: [
            { status: 'uploading', progress: progress1 },
            { status: 'pending', progress: 0 },
            { status: 'pending', progress: 0 }
          ]
        }))
      }
    }, 100)
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Upload Progress Demo</h2>
      <button
        onClick={startDemo}
        disabled={showDemo && demoStep !== 'completed'}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {showDemo && demoStep !== 'completed' ? 'Demo Running...' : 'Start Demo'}
      </button>

      <UploadProgress
        isVisible={showDemo}
        files={demoFiles}
        currentStep={demoStep}
        progress={demoProgress}
        error={null}
        onCancel={() => setShowDemo(false)}
      />
    </div>
  )
}

export default UploadProgressDemo
