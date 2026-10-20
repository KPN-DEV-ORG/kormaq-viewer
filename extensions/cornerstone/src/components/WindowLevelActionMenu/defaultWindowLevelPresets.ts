// The following are the default window level presets and can be further
// configured via the customization service.
const defaultWindowLevelPresets = {
  CT: [
    {
      id: 'ct-soft-tissue',
      description: 'Soft tissue',
      details: 'General CT soft-tissue contrast for organs and vessels.',
      window: '400',
      level: '40',
    },
    {
      id: 'ct-abdomen',
      description: 'Abdomen',
      details: 'Abdominal organs and soft tissues; a general starting point.',
      window: '400',
      level: '50',
    },
    {
      id: 'ct-lung',
      description: 'Lung',
      details: 'Wide window for lung parenchyma and fine air-space detail.',
      window: '1500',
      level: '-600',
    },
    {
      id: 'ct-mediastinum',
      description: 'Mediastinum',
      details: 'Chest soft tissues, mediastinal structures, and vessels.',
      window: '350',
      level: '50',
    },
    {
      id: 'ct-liver',
      description: 'Liver',
      details: 'Narrower abdominal window to show subtle liver attenuation differences.',
      window: '150',
      level: '30',
    },
    {
      id: 'ct-bone',
      description: 'Bone',
      details: 'Wide window for cortical and trabecular bone detail.',
      window: '2500',
      level: '480',
    },
    {
      id: 'ct-spine-soft-tissue',
      description: 'Spine · soft tissue',
      details: 'Spinal canal and paraspinal soft tissues.',
      window: '250',
      level: '50',
    },
    {
      id: 'ct-spine-bone',
      description: 'Spine · bone',
      details: 'Vertebral cortex, trabeculae, and fracture detail.',
      window: '1800',
      level: '400',
    },
    {
      id: 'ct-brain',
      description: 'Brain / head',
      details: 'General intracranial soft-tissue contrast.',
      window: '80',
      level: '40',
    },
    {
      id: 'ct-subdural',
      description: 'Subdural',
      details: 'Alternative head window for extra-axial collections near the skull.',
      window: '210',
      level: '100',
    },
    {
      id: 'ct-stroke',
      description: 'Stroke',
      details: 'Narrow brain window to increase gray-white contrast for subtle early ischemic change.',
      window: '40',
      level: '40',
    },
    {
      id: 'ct-temporal-bones',
      description: 'Temporal bones',
      details: 'Very wide high-center window for fine temporal-bone structures.',
      window: '4000',
      level: '600',
    },
    {
      id: 'ct-neck',
      description: 'Neck · soft tissue',
      details: 'Neck soft tissues and spaces.',
      window: '350',
      level: '50',
    },
  ],

  PT: [
    { id: 'pt-default', description: 'Default', window: '5', level: '2.5' },
    { id: 'pt-suv-3', description: 'SUV', window: '0', level: '3' },
    { id: 'pt-suv-5', description: 'SUV', window: '0', level: '5' },
    { id: 'pt-suv-7', description: 'SUV', window: '0', level: '7' },
    { id: 'pt-suv-8', description: 'SUV', window: '0', level: '8' },
    { id: 'pt-suv-10', description: 'SUV', window: '0', level: '10' },
    { id: 'pt-suv-15', description: 'SUV', window: '0', level: '15' },
  ],
};

export default defaultWindowLevelPresets;
