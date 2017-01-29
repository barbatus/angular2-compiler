import {chai} from 'meteor/practicalmeteor:chai';
import {sinon} from 'meteor/practicalmeteor:sinon';

const should = chai.should();
const expect = chai.expect;

describe('all-in-one compiler', () => {
  describe('default mode', () => {
    const htmlContent = '<div class="foo1 foo2">foo</div>';
    const cssContent = '.foo { color: blue; .red { color: red } }';

    describe('asset compilers', () => {
      it('LESS, SCSS, HTML recognized and compiled', () => {
        const compiler = new AngularCompiler();
        const htmlFile = new InputFile(htmlContent, 'foo.html');
        const scssFile = new InputFile(cssContent, 'foo.scss');
        const lessFile = new InputFile(cssContent, 'foo.less');

        compiler.processFilesForTarget([htmlFile, scssFile, lessFile]);

        expect(htmlFile.result).to.not.be.null;
        expect(scssFile.result).to.not.be.null;
        expect(lessFile.result).to.not.be.null;
      });
    });

    describe('typescript compiler', () => {
      it('default assets importing should work', () => {
        const compiler = new AngularCompiler();
        const tsCode = `
          import template from './foo.html';
          import style from './imports/foo.less';

          console.log(template);
          console.log(style);
        `;
        const tsFile = new InputFile(tsCode, 'foo.ts');
        tsFile.warn = sinon.spy();
        const htmlFile = new InputFile(htmlContent, 'foo.html');
        const lessFile = new InputFile(cssContent, 'imports/foo.less');

        compiler.processFilesForTarget([tsFile, htmlFile, lessFile]);

        expect(tsFile.warn.called).to.be.false;
        expect(tsFile.result).to.not.be.null;
      });
    });
  });
});
