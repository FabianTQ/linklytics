// Cross-platform `k8s-down`: delete the kind cluster.
import { execFileSync } from 'node:child_process';

try {
  execFileSync('kind', ['delete', 'cluster', '--name', 'linklytics'], { stdio: 'inherit' });
} catch {
  process.exit(1);
}
