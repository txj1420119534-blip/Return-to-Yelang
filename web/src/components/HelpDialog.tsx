import { Dialog } from './Dialog';

export function HelpDialog({ open, title, body, steps, onClose }: { open: boolean; title: string; body: string; steps?: string[]; onClose: () => void }) {
  return (
    <Dialog open={open} title={title} eyebrow="玩法帮助" onClose={onClose}>
      <p className="help-lede">{body}</p>
      {steps?.length ? (
        <ol className="help-steps">
          {steps.map((step, index) => (
            <li key={step}><span>{index + 1}</span><p>{step}</p></li>
          ))}
        </ol>
      ) : null}
      <p className="source-note">若页面数据与现场口令不同，以现场工作人员与服务端结算为准。</p>
    </Dialog>
  );
}
