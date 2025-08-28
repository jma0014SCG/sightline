import crypto from 'crypto'

interface FingerprintComponents {
  // Browser characteristics
  userAgent: string
  language: string
  languages: string[]
  platform: string
  cookieEnabled: boolean
  doNotTrack: string | null
  hardwareConcurrency: number
  deviceMemory: number | undefined
  
  // Screen properties
  screenResolution: string
  screenColorDepth: number
  screenPixelRatio: number
  
  // Timezone and locale
  timezone: string
  timezoneOffset: number
  
  // Canvas fingerprint
  canvasFingerprint?: string
  
  // WebGL fingerprint
  webglVendor?: string
  webglRenderer?: string
  
  // Audio fingerprint
  audioFingerprint?: string
  
  // Font detection
  installedFonts?: string[]
  
  // Plugin detection
  plugins?: string[]
  
  // WebRTC local IPs
  localIPs?: string[]
  
  // Performance metrics
  performanceMetrics?: {
    navigationTiming: number
    resourceTiming: number
  }
}

/**
 * Generates a canvas fingerprint
 */
function generateCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return 'unavailable'
    
    // Draw complex patterns for uniqueness
    ctx.textBaseline = 'top'
    ctx.font = '14px "Arial"'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('BrowserFingerprint,!~€', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('BrowserFingerprint,!~€', 4, 17)
    
    // Get data URL and hash it
    const dataURL = canvas.toDataURL()
    return crypto.createHash('md5').update(dataURL).digest('hex').substring(0, 16)
  } catch (e) {
    return 'error'
  }
}

/**
 * Generates WebGL fingerprint
 */
function generateWebGLFingerprint(): { vendor?: string; renderer?: string } {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (!gl) return {}
    
    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return {}
    
    const webglContext = gl as WebGLRenderingContext
    
    return {
      vendor: webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    }
  } catch (e) {
    return {}
  }
}

/**
 * Generates audio fingerprint using Web Audio API
 */
async function generateAudioFingerprint(): Promise<string> {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return 'unavailable'
    
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const analyser = context.createAnalyser()
    const gain = context.createGain()
    const scriptProcessor = context.createScriptProcessor(4096, 1, 1)
    
    gain.gain.value = 0 // Mute
    oscillator.type = 'triangle'
    oscillator.frequency.value = 10000
    
    oscillator.connect(analyser)
    analyser.connect(scriptProcessor)
    scriptProcessor.connect(gain)
    gain.connect(context.destination)
    
    return new Promise((resolve) => {
      let fingerprint = ''
      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        const output = event.outputBuffer.getChannelData(0)
        const slice = output.slice(0, 100)
        const hash = crypto.createHash('md5')
          .update(slice.toString())
          .digest('hex')
          .substring(0, 16)
        fingerprint = hash
        
        oscillator.disconnect()
        analyser.disconnect()
        scriptProcessor.disconnect()
        gain.disconnect()
        scriptProcessor.onaudioprocess = null
        
        resolve(fingerprint)
      }
      
      oscillator.start(0)
      oscillator.stop(context.currentTime + 0.1)
    })
  } catch (e) {
    return 'error'
  }
}

/**
 * Detects installed fonts
 */
function detectInstalledFonts(): string[] {
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
    'Impact', 'Lucida Sans Unicode', 'Tahoma', 'Century Gothic', 'Lucida Console'
  ]
  
  const baseFonts = ['monospace', 'sans-serif', 'serif']
  const testString = 'mmmmmmmmmmlli'
  const testSize = '72px'
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return []
  
  const detectFont = (font: string): boolean => {
    for (const baseFont of baseFonts) {
      ctx.font = `${testSize} ${baseFont}`
      const baseWidth = ctx.measureText(testString).width
      
      ctx.font = `${testSize} ${font}, ${baseFont}`
      const testWidth = ctx.measureText(testString).width
      
      if (testWidth !== baseWidth) return true
    }
    return false
  }
  
  return testFonts.filter(detectFont)
}

/**
 * Gets WebRTC local IPs (requires permission)
 */
async function getLocalIPs(): Promise<string[]> {
  const ips: string[] = []
  
  try {
    const pc = new RTCPeerConnection({
      iceServers: []
    })
    
    pc.createDataChannel('')
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    
    return new Promise((resolve) => {
      const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/g
      
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          pc.close()
          resolve(ips)
          return
        }
        
        const matches = event.candidate.candidate.match(ipRegex)
        if (matches) {
          matches.forEach(ip => {
            if (!ips.includes(ip) && !ip.startsWith('0.')) {
              ips.push(ip)
            }
          })
        }
      }
      
      // Timeout after 1 second
      setTimeout(() => {
        pc.close()
        resolve(ips)
      }, 1000)
    })
  } catch (e) {
    return []
  }
}

/**
 * Generates enhanced fingerprint with multiple data points
 */
export async function generateEnhancedFingerprint(): Promise<string> {
  const components: FingerprintComponents = {
    // Basic browser info
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: Array.from(navigator.languages || []),
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory,
    
    // Screen info
    screenResolution: `${screen.width}x${screen.height}`,
    screenColorDepth: screen.colorDepth,
    screenPixelRatio: window.devicePixelRatio || 1,
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Canvas fingerprint
    canvasFingerprint: generateCanvasFingerprint(),
    
    // Plugins (deprecated but still useful)
    plugins: Array.from(navigator.plugins || []).map(p => p.name),
    
    // Performance metrics
    performanceMetrics: window.performance ? {
      navigationTiming: window.performance.timing ? 
        window.performance.timing.loadEventEnd - window.performance.timing.navigationStart : 0,
      resourceTiming: window.performance.getEntriesByType ? 
        window.performance.getEntriesByType('resource').length : 0
    } : undefined
  }
  
  // WebGL fingerprint
  const webgl = generateWebGLFingerprint()
  components.webglVendor = webgl.vendor
  components.webglRenderer = webgl.renderer
  
  // Audio fingerprint (async)
  components.audioFingerprint = await generateAudioFingerprint()
  
  // Font detection
  components.installedFonts = detectInstalledFonts()
  
  // Local IPs (async, may require permission)
  components.localIPs = await getLocalIPs()
  
  // Create stable hash from all components
  const fingerprintString = JSON.stringify(components, Object.keys(components).sort())
  const hash = crypto.createHash('sha256').update(fingerprintString).digest('hex')
  
  return hash
}

/**
 * Generates a simple fingerprint for fallback
 */
export function generateSimpleFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled,
    navigator.hardwareConcurrency || 'unknown'
  ]
  
  const fingerprintString = components.join('|')
  return crypto.createHash('md5').update(fingerprintString).digest('hex')
}

/**
 * Validates if a fingerprint is likely unique enough
 */
export function validateFingerprint(fingerprint: string): {
  isValid: boolean
  confidence: number
  reason?: string
} {
  // Check length
  if (fingerprint.length < 32) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Fingerprint too short'
    }
  }
  
  // Check for common/default values that indicate low uniqueness
  const commonFingerprints = [
    'd41d8cd98f00b204e9800998ecf8427e', // MD5 of empty string
    'e3b0c44298fc1c149afbf4c8996fb924', // SHA256 of empty string
  ]
  
  if (commonFingerprints.includes(fingerprint)) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Common/default fingerprint detected'
    }
  }
  
  // Calculate entropy estimate
  const uniqueChars = new Set(fingerprint).size
  const confidence = Math.min(uniqueChars / 16, 1) // Hex has 16 possible chars
  
  return {
    isValid: true,
    confidence,
    reason: confidence < 0.5 ? 'Low entropy fingerprint' : undefined
  }
}

/**
 * Combines multiple tracking methods for robust identification
 */
export async function generateRobustIdentifier(ipAddress?: string): Promise<{
  fingerprint: string
  fallbackFingerprint: string
  ipRange?: string
  confidence: number
}> {
  // Generate both fingerprints
  const [enhancedFp, simpleFp] = await Promise.all([
    generateEnhancedFingerprint().catch(() => generateSimpleFingerprint()),
    Promise.resolve(generateSimpleFingerprint())
  ])
  
  // Validate the enhanced fingerprint
  const validation = validateFingerprint(enhancedFp)
  
  // Calculate IP range (first 3 octets for IPv4)
  const ipRange = ipAddress ? 
    ipAddress.split('.').slice(0, 3).join('.') + '.0/24' : 
    undefined
  
  // Combine all identifiers for ultimate tracking
  const combinedIdentifier = crypto.createHash('sha256')
    .update(enhancedFp)
    .update(simpleFp)
    .update(ipRange || 'no-ip')
    .digest('hex')
  
  return {
    fingerprint: combinedIdentifier,
    fallbackFingerprint: simpleFp,
    ipRange,
    confidence: validation.confidence
  }
}