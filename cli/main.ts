#!/usr/bin/env bun

import { run } from '@/index.ts'
import { version } from '../package.json' with { type: 'json' }

void run({ name: 'concise-ti', version }, import.meta)
