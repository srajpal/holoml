# Jing

Jing 20241231, the reference RELAX NG validator, by James Clark and the
Thai Open Source Software Center (https://github.com/relaxng/jing-trang),
under the 3-clause BSD licence in `COPYING.txt`. From Maven Central
(`org.relaxng:jing:20241231`); its SHA-256 is
`ea5e9026244d977e607d8b52212d6871498ece51939f9c49d0e7a77aad91133a`, which
the test that uses it checks.

holoml's tests run it (packages/schema/src/relaxng-jing.test.ts) to check
the RELAX NG schema in spec/ and the conformance samples against it
(HyperSpace 3D milestone 25, Q5; owner, prompt 170). It needs Java.
