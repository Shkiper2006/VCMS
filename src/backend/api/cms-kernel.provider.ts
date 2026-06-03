import { createCmsKernel, type CmsKernel, type User } from '../../main';

export const CMS_KERNEL = Symbol('CMS_KERNEL');
export const CMS_CURRENT_USER = Symbol('CMS_CURRENT_USER');

interface BackendCmsContext {
  kernel: CmsKernel;
  currentUser: User;
}

function createBackendCmsContext(): BackendCmsContext {
  const kernel = createCmsKernel();

  const currentUser = kernel.users.createUser({
    email: process.env.VCMS_ADMIN_EMAIL ?? 'admin@example.test',
    name: process.env.VCMS_ADMIN_NAME ?? 'Admin',
    role: 'admin',
    passwordHash: process.env.VCMS_ADMIN_PASSWORD_HASH ?? 'local-demo-hash',
  });

  kernel.themes.activate({
    name: 'default',
    version: '0.1.0',
    description: 'Default VCMS theme registered by the NestJS backend.',
    editableTemplates: {
      home: {
        themeId: 'default',
        template: 'home',
        canvas: { width: 1440, height: 900, breakpoint: 'desktop' },
        regions: [],
        updatedBy: currentUser.id,
        updatedAt: new Date(),
      },
    },
  });

  return { kernel, currentUser };
}

const context = createBackendCmsContext();

export const cmsKernelProvider = {
  provide: CMS_KERNEL,
  useValue: context.kernel,
};

export const currentUserProvider = {
  provide: CMS_CURRENT_USER,
  useValue: context.currentUser,
};
