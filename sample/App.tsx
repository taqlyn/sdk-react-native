/**
 * Minimal sample — imports the public facade only.
 * Flow: configure → resolveDeferred → setReadyForNavigation → observe → consume
 */
import { useEffect, useState } from 'react'
import { SafeAreaView, Text, Button, StyleSheet } from 'react-native'
import {
  configure,
  resolveDeferred,
  observeLinks,
  setReadyForNavigation,
  consume,
  type DeferredLink,
} from '@taqlyn/sdk-react-native'
// Soft helper from Phase 07/08 optional stub (ready-gate nav bootstrap).
import { mapDeferredLinkToHref, whenReadyNavigate } from '@taqlyn/nav-expo-router'

configure('app_sample', 'pk_sample', {
  apiBaseUrl: 'https://api.sandbox.example.com',
  linkProcessingMode: 'all',
  env: 'sandbox',
})

export default function App() {
  const [status, setStatus] = useState('boot')
  const [pending, setPending] = useState<DeferredLink | null>(null)
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    let sub = observeLinks((link) => {
      setPending(link)
      setHref(mapDeferredLinkToHref(link))
      setStatus(`link:${link.linkId}`)
    })

    void (async () => {
      setStatus('resolving')
      await resolveDeferred()
      setStatus('waiting-ready')
    })()

    return () => sub.unsubscribe()
  }, [])

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Taqlyn RN sample</Text>
      <Text>status: {status}</Text>
      <Text>href: {href ?? '—'}</Text>
      <Button
        title="Ready for navigation"
        onPress={() => {
          whenReadyNavigate(() => {
            setReadyForNavigation(true)
            setStatus('ready')
          })
        }}
      />
      <Button
        title="Consume pending"
        onPress={() => {
          if (!pending) return
          consume(pending.linkId)
          setPending(null)
          setStatus('consumed')
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
})
