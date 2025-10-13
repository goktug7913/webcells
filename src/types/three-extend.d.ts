import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ReactThreeFiber } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      unrealBloomPass: ReactThreeFiber.Node<UnrealBloomPass, typeof UnrealBloomPass>;
    }
  }
}


