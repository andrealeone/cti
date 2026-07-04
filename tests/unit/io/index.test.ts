import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createIo, createLogger } from '@/io/index'
import { createEnvManager } from '../../helpers/env'

describe('createIo', () => {
  test('exposes the full Io surface', () => {
    const io = createIo()
    expect(typeof io.isTTY).toBe('boolean')
    expect(typeof io.color).toBe('function')
    expect(typeof io.write).toBe('function')
    expect(typeof io.writeError).toBe('function')
    expect(typeof io.spinner).toBe('function')
    expect(typeof io.prompt).toBe('function')
    expect(typeof io.confirm).toBe('function')
    expect(typeof io.select).toBe('function')
  })

  test('write appends a newline to stdout', () => {
    const io = createIo()
    const original = process.stdout.write.bind(process.stdout)
    let captured = ''

    process.stdout.write = (chunk: string) => {
      captured += chunk
      return true
    }

    try {
      io.write('hello')
    } finally {
      process.stdout.write = original
    }

    expect(captured).toBe('hello\n')
  })
})

describe('createLogger', () => {
  const envManager = createEnvManager(['DEBUG'])

  beforeEach(() => {
    envManager.beforeEach()
  })

  afterEach(() => {
    envManager.afterEach()
  })

  describe('level', () => {
    test('starts at info level', () => {
      expect(createLogger().level).toBe('info')
    })
  })

  describe('debug', () => {
    test('is silent unless DEBUG is set', () => {
      const original = console.log
      let calls = 0

      console.log = () => {
        calls++
      }

      try {
        createLogger().debug('quiet')
      } finally {
        console.log = original
      }

      expect(calls).toBe(0)
    })

    test('emits when DEBUG is set', () => {
      process.env.DEBUG = '1'
      const original = console.log
      let calls = 0

      console.log = () => {
        calls++
      }

      try {
        createLogger().debug('loud')
      } finally {
        console.log = original
      }

      expect(calls).toBe(1)
    })
  })

  describe('info', () => {
    test('always prints via console.log', () => {
      const original = console.log
      let calls = 0

      console.log = () => {
        calls++
      }

      try {
        createLogger().info('hello')
      } finally {
        console.log = original
      }

      expect(calls).toBe(1)
    })
  })

  describe('warn', () => {
    test('always prints via console.warn', () => {
      const original = console.warn
      let calls = 0

      console.warn = () => {
        calls++
      }

      try {
        createLogger().warn('careful')
      } finally {
        console.warn = original
      }

      expect(calls).toBe(1)
    })
  })
})
