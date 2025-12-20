<script lang="ts">
  import './Skeleton.css';

  interface Props {
    width?: string;
    height?: string;
    borderRadius?: string;
    style?: string;
  }

  let { width = '100%', height = '20px', borderRadius = '12px', style = '' }: Props = $props();
</script>

<div 
  class="skeleton" 
  style:width={width} 
  style:height={height} 
  style:border-radius={borderRadius}
  style="{style}"
></div>